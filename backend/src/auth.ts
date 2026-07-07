import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { config } from "./config.js";
import { usersCollection, type UserDocument } from "./db.js";

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
  // Routes attach the loaded user after validating the bearer token.
  user?: UserDocument;
}

interface TokenPayload {
  sub: string;
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

export function signToken(user: UserDocument): string {
  // JWT payload only needs the user id; the database remains the source of truth.
  return jwt.sign({ sub: user._id.toHexString() }, config.jwtSecret, {
    expiresIn: "7d",
  });
}

export async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Downstream routes use request.user, so each token is resolved against MongoDB.
    const header = request.header("Authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (!token) {
      response.status(401).json({ error: "Missing auth token." });
      return;
    }

    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    const user = await usersCollection().findOne({ _id: new ObjectId(payload.sub) });
    if (!user) {
      response.status(401).json({ error: "User no longer exists." });
      return;
    }

    request.user = user;
    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired auth token." });
  }
}
