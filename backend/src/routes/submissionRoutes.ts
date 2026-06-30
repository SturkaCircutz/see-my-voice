import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";
import { taskSubmissionsCollection } from "../db.js";

export const submissionRoutes = Router();

function toSubmissionResponse(submission: {
  _id: ObjectId;
  taskId: ObjectId;
  studentId: ObjectId;
  attemptId?: ObjectId;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  // Convert ObjectIds before submissions cross the Express API boundary.
  return {
    id: submission._id.toHexString(),
    taskId: submission.taskId.toHexString(),
    studentId: submission.studentId.toHexString(),
    attemptId: submission.attemptId?.toHexString(),
    status: submission.status,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  };
}

submissionRoutes.use(requireAuth);

submissionRoutes.get("/", async (request: AuthenticatedRequest, response) => {
  const submissions = await taskSubmissionsCollection()
    .find({ studentId: request.user!._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  response.json({ submissions: submissions.map(toSubmissionResponse) });
});

submissionRoutes.post("/", async (request: AuthenticatedRequest, response) => {
  const taskId = String(request.body.taskId || "").trim();
  const attemptId = String(request.body.attemptId || "").trim();

  if (!ObjectId.isValid(taskId)) {
    response.status(400).json({ error: "taskId is required." });
    return;
  }
  if (attemptId && !ObjectId.isValid(attemptId)) {
    response.status(400).json({ error: "attemptId is invalid." });
    return;
  }

  const now = new Date();
  const submission = {
    _id: new ObjectId(),
    taskId: new ObjectId(taskId),
    studentId: request.user!._id,
    attemptId: attemptId ? new ObjectId(attemptId) : undefined,
    status: "submitted" as const,
    createdAt: now,
    updatedAt: now,
  };

  await taskSubmissionsCollection().insertOne(submission);
  response.status(201).json({ submission: toSubmissionResponse(submission) });
});
