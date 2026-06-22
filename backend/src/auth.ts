import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { config } from "./config.js";
import { usersCollection, type UserDocument } from "./db.js";

export interface PublicUser {
  id: string;
  username: string;
  name: string;
  createdAt: string;
  lastLoginAt?: string;
  loginCount: number;
}

export interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface TokenPayload {
  sub: string;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toHexString(),
    username: user.username,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString(),
    loginCount: user.loginCount,
  };
}

export function signToken(user: UserDocument): string {
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
