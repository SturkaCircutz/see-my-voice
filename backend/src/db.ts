import { MongoClient, type Collection, type Db, ObjectId } from "mongodb";
import { config } from "./config.js";

export interface UserDocument {
  _id: ObjectId;
  username: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginCount: number;
}

export interface LoginEventDocument {
  _id?: ObjectId;
  userId: ObjectId;
  username: string;
  action: "register" | "login";
  createdAt: Date;
  ip?: string;
  userAgent?: string;
}

let client: MongoClient | null = null;
let database: Db | null = null;
let connectionPromise: Promise<Db> | null = null;

export async function connectToMongo(): Promise<Db> {
  if (database) return database;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    client = new MongoClient(config.mongoUri);
    await client.connect();
    database = client.db(config.mongoDbName);

    await Promise.all([
      usersCollection().createIndex({ username: 1 }, { unique: true }),
      loginEventsCollection().createIndex({ userId: 1, createdAt: -1 }),
      loginEventsCollection().createIndex({ username: 1, createdAt: -1 }),
    ]);

    return database;
  })().catch((error) => {
    connectionPromise = null;
    client = null;
    database = null;
    throw error;
  });

  return connectionPromise;
}

export function usersCollection(): Collection<UserDocument> {
  if (!database) throw new Error("MongoDB is not connected.");
  return database.collection<UserDocument>("users");
}

export function loginEventsCollection(): Collection<LoginEventDocument> {
  if (!database) throw new Error("MongoDB is not connected.");
  return database.collection<LoginEventDocument>("login_events");
}

export async function closeMongo(): Promise<void> {
  await client?.close();
  client = null;
  database = null;
}
