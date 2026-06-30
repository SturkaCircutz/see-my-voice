import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";
import { tasksCollection } from "../db.js";

export const taskRoutes = Router();

function toTaskResponse(task: {
  _id: ObjectId;
  teacherId: ObjectId;
  studentId: ObjectId;
  title: string;
  targetText: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  // Keep task route responses JSON-safe while preserving teacher/student ownership ids.
  return {
    id: task._id.toHexString(),
    teacherId: task.teacherId.toHexString(),
    studentId: task.studentId.toHexString(),
    title: task.title,
    targetText: task.targetText,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

taskRoutes.use(requireAuth);

taskRoutes.get("/", async (request: AuthenticatedRequest, response) => {
  const userId = request.user!._id;
  const tasks = await tasksCollection()
    .find({
      $or: [
        { teacherId: userId },
        { studentId: userId },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  response.json({ tasks: tasks.map(toTaskResponse) });
});

taskRoutes.post("/", async (request: AuthenticatedRequest, response) => {
  const title = String(request.body.title || "").trim();
  const targetText = String(request.body.targetText || "").trim();
  const studentId = String(request.body.studentId || "").trim();

  if (!title || !targetText || !ObjectId.isValid(studentId)) {
    response.status(400).json({ error: "Title, target text, and studentId are required." });
    return;
  }

  const now = new Date();
  const task = {
    _id: new ObjectId(),
    teacherId: request.user!._id,
    studentId: new ObjectId(studentId),
    title,
    targetText,
    status: "published" as const,
    createdAt: now,
    updatedAt: now,
  };

  await tasksCollection().insertOne(task);
  response.status(201).json({ task: toTaskResponse(task) });
});
