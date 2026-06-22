import { Router } from "express";
import { requireAuth, toPublicUser } from "../auth.js";
import { usersCollection } from "../db.js";

export const userRoutes = Router();

userRoutes.get("/", requireAuth, async (_request, response) => {
  const users = await usersCollection()
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  response.json({ users: users.map(toPublicUser) });
});
