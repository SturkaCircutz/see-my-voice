import { MongoClient, type Collection, type Db, ObjectId } from "mongodb";
import { config } from "./config.js";

export interface UserDocument {
  _id: ObjectId;
  username: string;
  name: string;
  role: "student" | "teacher";
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

export type PracticeAttemptStatus = "created" | "analyzing" | "complete" | "failed";

export interface PracticeAttemptDocument {
  _id: ObjectId;
  userId: ObjectId;
  targetText: string;
  status: PracticeAttemptStatus;
  createdAt: Date;
  updatedAt: Date;
  audio?: {
    storageKey?: string;
    mimeType?: string;
  };
  analysis?: unknown;
  analysisContentType?: string;
  error?: string;
}

export interface TaskDocument {
  _id: ObjectId;
  teacherId: ObjectId;
  studentId: ObjectId;
  title: string;
  goal: string;
  targetText: string;
  suggestedDue: string;
  requiredSubmissions: number;
  practiceText: string;
  focusTag?: string;
  teacherNote?: string;
  reviewTags?: string[];
  exerciseSet: {
    id: string;
    type: string;
    title: string;
    instruction: string;
    targetText: string;
    requiredCount: number;
    requiresSubmission: boolean;
    practiceItems: string[];
    sourceMode?: "bank" | "custom";
    bankPackageId?: string;
  }[];
  status: "draft" | "published" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskSubmissionDocument {
  _id: ObjectId;
  taskId: ObjectId;
  studentId: ObjectId;
  attemptId?: ObjectId;
  status: "submitted" | "reviewed";
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewDocument {
  _id: ObjectId;
  submissionId: ObjectId;
  teacherId: ObjectId;
  feedback: string;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatThreadDocument {
  _id: ObjectId;
  memberIds: ObjectId[];
  type: "direct" | "class";
  title: string;
  lastMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageDocument {
  _id: ObjectId;
  threadId: ObjectId;
  senderId: ObjectId;
  body: string;
  createdAt: Date;
}

let client: MongoClient | null = null;
let database: Db | null = null;
let connectionPromise: Promise<Db> | null = null;

export async function connectToMongo(): Promise<Db> {
  if (database) return database;
  if (connectionPromise) return connectionPromise;

  // Share one in-flight connection so concurrent route bootstraps do not open duplicate clients.
  connectionPromise = (async () => {
    client = new MongoClient(config.mongoUri);
    await client.connect();
    database = client.db(config.mongoDbName);

    // Collection indexes live beside the typed collection accessors to keep MongoDB contract changes visible.
    await Promise.all([
      usersCollection().createIndex({ username: 1 }, { unique: true }),
      loginEventsCollection().createIndex({ userId: 1, createdAt: -1 }),
      loginEventsCollection().createIndex({ username: 1, createdAt: -1 }),
      practiceAttemptsCollection().createIndex({ userId: 1, createdAt: -1 }),
      tasksCollection().createIndex({ studentId: 1, status: 1, createdAt: -1 }),
      tasksCollection().createIndex({ teacherId: 1, createdAt: -1 }),
      taskSubmissionsCollection().createIndex({ taskId: 1, studentId: 1, createdAt: -1 }),
      reviewsCollection().createIndex({ submissionId: 1, createdAt: -1 }),
      chatThreadsCollection().createIndex({ memberIds: 1, updatedAt: -1 }),
      chatMessagesCollection().createIndex({ threadId: 1, createdAt: 1 }),
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

export function practiceAttemptsCollection(): Collection<PracticeAttemptDocument> {
  if (!database) throw new Error("MongoDB is not connected.");
  return database.collection<PracticeAttemptDocument>("practice_attempts");
}

export function tasksCollection(): Collection<TaskDocument> {
  if (!database) throw new Error("MongoDB is not connected.");
  return database.collection<TaskDocument>("tasks");
}

export function taskSubmissionsCollection(): Collection<TaskSubmissionDocument> {
  if (!database) throw new Error("MongoDB is not connected.");
  return database.collection<TaskSubmissionDocument>("task_submissions");
}

export function reviewsCollection(): Collection<ReviewDocument> {
  if (!database) throw new Error("MongoDB is not connected.");
  return database.collection<ReviewDocument>("reviews");
}

export function chatThreadsCollection(): Collection<ChatThreadDocument> {
  if (!database) throw new Error("MongoDB is not connected.");
  return database.collection<ChatThreadDocument>("chat_threads");
}

export function chatMessagesCollection(): Collection<ChatMessageDocument> {
  if (!database) throw new Error("MongoDB is not connected.");
  return database.collection<ChatMessageDocument>("chat_messages");
}

export async function closeMongo(): Promise<void> {
  await client?.close();
  client = null;
  database = null;
}
