import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";
import { chatMessagesCollection, chatThreadsCollection, usersCollection, type ChatThreadDocument } from "../db.js";

export const chatRoutes = Router();

function toThreadResponse(thread: {
  _id: ObjectId;
  memberIds: ObjectId[];
  type?: "direct" | "class";
  title: string;
  lastMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  // Flatten Mongo ids before thread data leaves the API.
  return {
    id: thread._id.toHexString(),
    memberIds: thread.memberIds.map((id) => id.toHexString()),
    type: thread.type || "direct",
    title: thread.title,
    lastMessage: thread.lastMessage || "",
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  };
}

function toMessageResponse(message: {
  _id: ObjectId;
  threadId: ObjectId;
  senderId: ObjectId;
  body: string;
  createdAt: Date;
}, senderName = "") {
  // Keep chat messages JSON-safe while preserving ownership and thread links.
  return {
    id: message._id.toHexString(),
    threadId: message.threadId.toHexString(),
    senderId: message.senderId.toHexString(),
    sender: senderName,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

chatRoutes.use(requireAuth);

chatRoutes.get("/threads", async (request: AuthenticatedRequest, response) => {
  // Only return conversations where the signed-in user is a member.
  const threads = await chatThreadsCollection()
    .find({ memberIds: request.user!._id })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();

  response.json({ threads: threads.map(toThreadResponse) });
});

chatRoutes.post("/threads", async (request: AuthenticatedRequest, response) => {
  // Create direct or class threads with unique member ids.
  const title = String(request.body.title || "Conversation").trim();
  const type = request.body.type === "class" ? "class" : "direct";
  const memberIds = Array.isArray(request.body.memberIds)
    ? request.body.memberIds.map((id: unknown) => String(id)).filter(ObjectId.isValid)
    : [];
  const uniqueMemberIds = [...new Set([request.user!._id.toHexString(), ...memberIds])]
    .map((id) => new ObjectId(id));

  if (uniqueMemberIds.length < 2) {
    response.status(400).json({ error: "At least one other member is required." });
    return;
  }

  const foundUsers = await usersCollection()
    .find({ _id: { $in: uniqueMemberIds } })
    .project({ _id: 1 })
    .toArray();
  if (foundUsers.length !== uniqueMemberIds.length) {
    response.status(400).json({ error: "Every chat member must be a registered user." });
    return;
  }

  if (type === "direct") {
    // Reuse an existing direct chat when the same members already have one.
    const existing = await chatThreadsCollection().findOne({
      type: "direct",
      memberIds: { $all: uniqueMemberIds },
      $expr: { $eq: [{ $size: "$memberIds" }, uniqueMemberIds.length] },
    });
    if (existing) {
      response.json({ thread: toThreadResponse(existing) });
      return;
    }
  }

  const now = new Date();
  const thread: ChatThreadDocument = {
    _id: new ObjectId(),
    memberIds: uniqueMemberIds,
    type,
    title: title || "Conversation",
    lastMessage: "",
    createdAt: now,
    updatedAt: now,
  };

  await chatThreadsCollection().insertOne(thread);
  response.status(201).json({ thread: toThreadResponse(thread) });
});

chatRoutes.get("/threads/:threadId/messages", async (request: AuthenticatedRequest, response) => {
  // Message reads require thread membership.
  if (!ObjectId.isValid(request.params.threadId)) {
    response.status(404).json({ error: "Thread not found." });
    return;
  }

  const threadId = new ObjectId(request.params.threadId);
  const thread = await chatThreadsCollection().findOne({
    _id: threadId,
    memberIds: request.user!._id,
  });
  if (!thread) {
    response.status(404).json({ error: "Thread not found." });
    return;
  }

  const messages = await chatMessagesCollection()
    .find({ threadId })
    .sort({ createdAt: 1 })
    .limit(200)
    .toArray();
  const senderIds = [...new Set(messages.map((message) => message.senderId.toHexString()))].map((id) => new ObjectId(id));
  // Resolve sender display names in one query instead of per message.
  const senders = senderIds.length
    ? await usersCollection()
        .find({ _id: { $in: senderIds } })
        .project({ _id: 1, name: 1, username: 1 })
        .toArray()
    : [];
  const senderNames = new Map(senders.map((sender) => [sender._id.toHexString(), sender.name || sender.username]));

  response.json({
    messages: messages.map((message) => toMessageResponse(message, senderNames.get(message.senderId.toHexString()) || "")),
  });
});

chatRoutes.post("/threads/:threadId/messages", async (request: AuthenticatedRequest, response) => {
  // New messages update both the message collection and the thread preview.
  if (!ObjectId.isValid(request.params.threadId)) {
    response.status(404).json({ error: "Thread not found." });
    return;
  }

  const threadId = new ObjectId(request.params.threadId);
  const body = String(request.body.body || "").trim();
  if (!body) {
    response.status(400).json({ error: "Message body is required." });
    return;
  }

  const thread = await chatThreadsCollection().findOne({
    _id: threadId,
    memberIds: request.user!._id,
  });
  if (!thread) {
    response.status(404).json({ error: "Thread not found." });
    return;
  }

  const now = new Date();
  const message = {
    _id: new ObjectId(),
    threadId,
    senderId: request.user!._id,
    body,
    createdAt: now,
  };

  await chatMessagesCollection().insertOne(message);
  await chatThreadsCollection().updateOne({ _id: threadId }, { $set: { lastMessage: body, updatedAt: now } });
  response.status(201).json({ message: toMessageResponse(message, request.user!.name || request.user!.username) });
});
