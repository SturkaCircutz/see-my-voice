import type { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { usersCollection, type UserDocument } from "./db.js";
import {
  clearAuthSessionCookie,
  destroyAuthSession,
  getAuthSessionUserId,
  readSessionToken,
} from "./session.js";

export interface PublicUser {
  id: string;
  username: string;
  name: string;
  role: "student" | "teacher";
  createdAt: string;
  lastLoginAt?: string;
  loginCount: number;
}

export interface AuthenticatedRequest extends Request {
  // Routes attach the loaded user after validating the Redis-backed cookie session.
  user?: UserDocument;
}

export function toPublicUser(user: UserDocument): PublicUser {
  // Keep password hashes and Mongo internals out of every auth-facing API response.
  return {
    id: user._id.toHexString(),
    username: user.username,
    name: user.name,
    role: user.role || "student",
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString(),
    loginCount: user.loginCount,
  };
}

export async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Downstream routes use request.user, so each session is resolved against MongoDB.
    const token = readSessionToken(request);
    if (!token) {
      response.status(401).json({ error: "Missing auth session." });
      return;
    }

    const userId = await getAuthSessionUserId(token);
    if (!ObjectId.isValid(userId)) {
      await destroyAuthSession(token);
      clearAuthSessionCookie(response);
      response.status(401).json({ error: "Invalid or expired auth session." });
      return;
    }

    const user = await usersCollection().findOne({ _id: new ObjectId(userId) });
    if (!user) {
      await destroyAuthSession(token);
      clearAuthSessionCookie(response);
      response.status(401).json({ error: "User no longer exists." });
      return;
    }

    request.user = user;
    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired auth session." });
  }
}
