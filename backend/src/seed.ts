import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { config } from "./config.js";
import { usersCollection, type UserDocument } from "./db.js";

export async function seedConfiguredUser(): Promise<void> {
  // Optional seed user supports demos and first deploy smoke tests.
  const username = config.seedUsername.trim().toLowerCase();
  const password = config.seedPassword;
  if (!username || !password) return;

  // The configured seed account is idempotent so deploys can refresh credentials without duplicating users.
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await usersCollection().findOne({ username });

  if (existing) {
    await usersCollection().updateOne(
      { _id: existing._id },
      {
        $set: {
          name: config.seedName || existing.name || username,
          role: existing.role || "student",
          passwordHash,
          updatedAt: now,
        },
      },
    );
    return;
  }

  const user: UserDocument = {
    _id: new ObjectId(),
    username,
    name: config.seedName || username,
    role: "student",
    passwordHash,
    createdAt: now,
    updatedAt: now,
    loginCount: 0,
  };

  await usersCollection().insertOne(user);
}
