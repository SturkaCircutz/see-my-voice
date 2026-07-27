import { randomBytes, createHash } from "node:crypto";
import type { Request, Response } from "express";
import { Redis } from "@upstash/redis";
import { config } from "./config.js";

interface StoredSession {
  userId: string;
  createdAt: string;
}

interface LocalSession extends StoredSession {
  expiresAt: number;
}

let redisClient: Redis | null | undefined;
const localSessions = new Map<string, LocalSession>();

function productionSessionStoreRequired(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  if (config.upstashRedisRestUrl && config.upstashRedisRestToken) {
    redisClient = new Redis({
      url: config.upstashRedisRestUrl,
      token: config.upstashRedisRestToken,
    });
    return redisClient;
  }
  redisClient = null;
  return redisClient;
}

function assertSessionStoreAvailable(): void {
  if (getRedis() || !productionSessionStoreRequired()) return;
  throw new Error(
    "Redis session store is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN from Vercel KV, or set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
  );
}

function sessionKey(token: string): string {
  const digest = createHash("sha256").update(token).digest("hex");
  return `see-my-voice:session:${digest}`;
}

function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

function parseCookieHeader(header: string): Record<string, string> {
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator < 0) return cookies;
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      if (name) cookies[name] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function cookieIsSecure(): boolean {
  const raw = process.env.AUTH_COOKIE_SECURE;
  if (raw) return raw.trim().toLowerCase() !== "false";
  return productionSessionStoreRequired();
}

function cookieSameSite(): "Lax" | "None" | "Strict" {
  const raw = (process.env.AUTH_COOKIE_SAMESITE || "").trim().toLowerCase();
  if (raw === "strict") return "Strict";
  if (raw === "none") return "None";
  return cookieIsSecure() ? "None" : "Lax";
}

function serializeSessionCookie(value: string, maxAgeSeconds: number): string {
  const parts = [
    `${config.authSessionCookieName}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAgeSeconds}`,
    `SameSite=${cookieSameSite()}`,
  ];
  if (cookieIsSecure()) parts.push("Secure");
  return parts.join("; ");
}

export function readSessionToken(request: Request): string {
  const cookies = parseCookieHeader(request.header("Cookie") || "");
  return cookies[config.authSessionCookieName] || "";
}

export async function createAuthSession(response: Response, userId: string): Promise<void> {
  assertSessionStoreAvailable();
  const token = newSessionToken();
  const session: StoredSession = {
    userId,
    createdAt: new Date().toISOString(),
  };
  const redis = getRedis();
  if (redis) {
    await redis.set(sessionKey(token), session, { ex: config.authSessionTtlSeconds });
  } else {
    localSessions.set(sessionKey(token), {
      ...session,
      expiresAt: Date.now() + config.authSessionTtlSeconds * 1000,
    });
  }
  response.setHeader("Set-Cookie", serializeSessionCookie(token, config.authSessionTtlSeconds));
}

export async function getAuthSessionUserId(token: string): Promise<string> {
  if (!token) return "";
  const key = sessionKey(token);
  const redis = getRedis();
  if (redis) {
    const session = await redis.get<StoredSession>(key);
    return session?.userId || "";
  }

  const session = localSessions.get(key);
  if (!session) return "";
  if (session.expiresAt <= Date.now()) {
    localSessions.delete(key);
    return "";
  }
  return session.userId;
}

export async function destroyAuthSession(token: string): Promise<void> {
  if (!token) return;
  const key = sessionKey(token);
  const redis = getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  localSessions.delete(key);
}

export function clearAuthSessionCookie(response: Response): void {
  response.setHeader("Set-Cookie", serializeSessionCookie("", 0));
}
