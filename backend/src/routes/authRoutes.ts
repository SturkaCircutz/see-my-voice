import bcrypt from "bcryptjs";
import { Router } from "express";
import { ObjectId } from "mongodb";
import {
  requireAuth,
  signToken,
  toPublicUser,
  type AuthenticatedRequest,
} from "../auth.js";
import {
  loginEventsCollection,
  usersCollection,
  type UserDocument,
} from "../db.js";

export const authRoutes = Router();

function cleanUsername(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function cleanName(value: unknown): string {
  return String(value || "").trim();
}

function readClientMeta(request: AuthenticatedRequest) {
  return {
    ip: request.ip,
    userAgent: request.header("User-Agent") || "",
  };
}

authRoutes.post("/register", async (request, response) => {
  const username = cleanUsername(request.body.username);
  const name = cleanName(request.body.name) || username;
  const password = String(request.body.password || "");

  if (!username || username.length < 2) {
    response.status(400).json({ error: "Username must be at least 2 characters." });
    return;
  }
  if (password.length < 3) {
    response.status(400).json({ error: "Password must be at least 3 characters." });
    return;
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);
  const user: UserDocument = {
    _id: new ObjectId(),
    username,
    name,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    loginCount: 1,
  };

  try {
    await usersCollection().insertOne(user);
    await loginEventsCollection().insertOne({
      userId: user._id,
      username: user.username,
      action: "register",
      createdAt: now,
      ...readClientMeta(request),
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      response.status(409).json({ error: "That username is already registered." });
      return;
    }
    throw error;
  }

  response.status(201).json({
    token: signToken(user),
    user: toPublicUser(user),
  });
});

authRoutes.post("/login", async (request, response) => {
  const username = cleanUsername(request.body.username);
  const password = String(request.body.password || "");
  const user = await usersCollection().findOne({ username });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    response.status(401).json({ error: "Username or password is incorrect." });
    return;
  }

  const now = new Date();
  await usersCollection().updateOne(
    { _id: user._id },
    {
      $set: { lastLoginAt: now, updatedAt: now },
      $inc: { loginCount: 1 },
    },
  );
  const updatedUser = {
    ...user,
    lastLoginAt: now,
    updatedAt: now,
    loginCount: user.loginCount + 1,
  };
  await loginEventsCollection().insertOne({
    userId: user._id,
    username: user.username,
    action: "login",
    createdAt: now,
    ...readClientMeta(request),
  });

  response.json({
    token: signToken(updatedUser),
    user: toPublicUser(updatedUser),
  });
});

authRoutes.get("/me", requireAuth, (request: AuthenticatedRequest, response) => {
  response.json({ user: toPublicUser(request.user!) });
});
