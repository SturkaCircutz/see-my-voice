import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";
import { chatMessagesCollection, chatThreadsCollection } from "../db.js";

export const chatRoutes = Router();

function toThreadResponse(thread: {
  _id: ObjectId;
  memberIds: ObjectId[];
  title: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  // Flatten Mongo ids before thread data leaves the API.
  return {
    id: thread._id.toHexString(),
    memberIds: thread.memberIds.map((id) => id.toHexString()),
    title: thread.title,
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
}) {
  // Keep chat messages JSON-safe while preserving ownership and thread links.
  return {
    id: message._id.toHexString(),
    threadId: message.threadId.toHexString(),
    senderId: message.senderId.toHexString(),
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

chatRoutes.use(requireAuth);

chatRoutes.get("/threads", async (request: AuthenticatedRequest, response) => {
  const threads = await chatThreadsCollection()
    .find({ memberIds: request.user!._id })
    .sort({ updatedAt: -1 })
    .limit(100)
    .toArray();

  response.json({ threads: threads.map(toThreadResponse) });
});

chatRoutes.post("/threads", async (request: AuthenticatedRequest, response) => {
  const title = String(request.body.title || "Conversation").trim();
  const memberIds = Array.isArray(request.body.memberIds)
    ? request.body.memberIds.map((id: unknown) => String(id)).filter(ObjectId.isValid)
    : [];
  const uniqueMemberIds = [...new Set([request.user!._id.toHexString(), ...memberIds])]
    .map((id) => new ObjectId(id));

  if (uniqueMemberIds.length < 2) {
    response.status(400).json({ error: "At least one other member is required." });
    return;
  }

  const now = new Date();
  const thread = {
    _id: new ObjectId(),
    memberIds: uniqueMemberIds,
    title: title || "Conversation",
    createdAt: now,
    updatedAt: now,
  };

  await chatThreadsCollection().insertOne(thread);
  response.status(201).json({ thread: toThreadResponse(thread) });
});

chatRoutes.get("/threads/:threadId/messages", async (request: AuthenticatedRequest, response) => {
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

  response.json({ messages: messages.map(toMessageResponse) });
});

chatRoutes.post("/threads/:threadId/messages", async (request: AuthenticatedRequest, response) => {
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
  await chatThreadsCollection().updateOne({ _id: threadId }, { $set: { updatedAt: now } });
  response.status(201).json({ message: toMessageResponse(message) });
});
