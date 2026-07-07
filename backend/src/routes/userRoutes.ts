import { Router } from "express";
import { requireAuth, toPublicUser } from "../auth.js";
import { usersCollection } from "../db.js";

export const userRoutes = Router();

userRoutes.get("/", requireAuth, async (request, response) => {
  const role = request.query.role === "student" || request.query.role === "teacher"
    ? request.query.role
    : "";
  const users = await usersCollection()
    .find(role ? { role } : {}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  response.json({ users: users.map(toPublicUser) });
});
