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
  // Usernames are stored lowercase so login is case-insensitive.
  return String(value || "").trim().toLowerCase();
}

function cleanName(value: unknown): string {
  return String(value || "").trim();
}

function cleanRole(value: unknown): "student" | "teacher" {
  // Unknown roles fall back to learner accounts.
  return value === "teacher" ? "teacher" : "student";
}

function roleLoginMessage(role: "student" | "teacher"): string {
  return role === "teacher"
    ? "This account is registered as a teacher. Use Teacher Login."
    : "This account is registered as a learner. Use Student Login.";
}

function readClientMeta(request: AuthenticatedRequest) {
  // Store lightweight request metadata for account history.
  return {
    ip: request.ip,
    userAgent: request.header("User-Agent") || "",
  };
}

authRoutes.post("/register", async (request, response) => {
  // Registration creates the user and immediately returns a signed session.
  const username = cleanUsername(request.body.username);
  const name = cleanName(request.body.name) || username;
  const role = cleanRole(request.body.role);
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
    role,
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
  // Login verifies credentials and prevents role-specific screens from crossing.
  const username = cleanUsername(request.body.username);
  const password = String(request.body.password || "");
  const requestedRole = cleanRole(request.body.role);
  const user = await usersCollection().findOne({ username });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    response.status(401).json({ error: "Username or password is incorrect." });
    return;
  }

  const accountRole = cleanRole(user.role);
  if (accountRole !== requestedRole) {
    response.status(403).json({ error: roleLoginMessage(accountRole) });
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
  // The frontend uses /me to restore a session from local storage.
  response.json({ user: toPublicUser(request.user!) });
});
