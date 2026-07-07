import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";
import { tasksCollection, usersCollection, type TaskDocument } from "../db.js";

export const taskRoutes = Router();

function toTaskResponse(task: {
  _id: ObjectId;
  teacherId: ObjectId;
  studentId: ObjectId;
  title: string;
  goal?: string;
  targetText: string;
  suggestedDue?: string;
  requiredSubmissions?: number;
  practiceText?: string;
  focusTag?: string;
  teacherNote?: string;
  reviewTags?: string[];
  exerciseSet?: TaskDocument["exerciseSet"];
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
    goal: task.goal || task.targetText,
    targetText: task.targetText,
    suggestedDue: task.suggestedDue || "Due this week",
    requiredSubmissions: task.requiredSubmissions || 1,
    practiceText: task.practiceText || task.targetText,
    focusTag: task.focusTag || "",
    teacherNote: task.teacherNote || "",
    reviewTags: task.reviewTags || [],
    exerciseSet: task.exerciseSet || [],
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

taskRoutes.use(requireAuth);

taskRoutes.get("/", async (request: AuthenticatedRequest, response) => {
  // Teachers see tasks they created; learners see tasks assigned to them.
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
  // Only teacher accounts can publish practice packs.
  if (request.user!.role !== "teacher") {
    response.status(403).json({ error: "Only teacher accounts can publish tasks." });
    return;
  }

  const title = String(request.body.title || "").trim();
  const goal = String(request.body.goal || "").trim();
  const targetText = String(request.body.targetText || request.body.practiceText || "").trim();
  const practiceText = String(request.body.practiceText || targetText).trim();
  const suggestedDue = String(request.body.suggestedDue || "Due this week").trim();
  const requiredSubmissions = Math.max(1, Number(request.body.requiredSubmissions || 1));
  const focusTag = String(request.body.focusTag || "").trim();
  const teacherNote = String(request.body.teacherNote || "").trim();
  const reviewTags = Array.isArray(request.body.reviewTags)
    ? request.body.reviewTags.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 12)
    : [];
  const exerciseSet = Array.isArray(request.body.exerciseSet)
    // Sanitize each client-edited step before storing it.
    ? request.body.exerciseSet.map((step: Record<string, unknown>, index: number) => ({
        id: String(step.id || `step-${index + 1}`).trim(),
        type: String(step.type || "Practice").trim(),
        title: String(step.title || `Practice Step ${index + 1}`).trim(),
        instruction: String(step.instruction || "Complete this teacher-assigned step.").trim(),
        targetText: String(step.targetText || practiceText || targetText).trim(),
        requiredCount: Math.max(1, Number(step.requiredCount || 1)),
        requiresSubmission: Boolean(step.requiresSubmission),
        practiceItems: Array.isArray(step.practiceItems)
          ? step.practiceItems.map((item: unknown) => String(item).trim()).filter(Boolean).slice(0, 40)
          : [],
        sourceMode: step.sourceMode === "bank" ? "bank" as const : step.sourceMode === "custom" ? "custom" as const : undefined,
        bankPackageId: String(step.bankPackageId || "").trim(),
      }))
    : [];
  const studentId = String(request.body.studentId || "").trim();

  if (!title || !targetText || !ObjectId.isValid(studentId) || !exerciseSet.length) {
    response.status(400).json({ error: "Title, target text, and studentId are required." });
    return;
  }

  const studentObjectId = new ObjectId(studentId);
  // Refuse tasks for missing or non-learner accounts.
  const student = await usersCollection().findOne({ _id: studentObjectId, role: "student" });
  if (!student) {
    response.status(400).json({ error: "Choose a real learner account before publishing a task." });
    return;
  }

  const now = new Date();
  const task: TaskDocument = {
    _id: new ObjectId(),
    teacherId: request.user!._id,
    studentId: studentObjectId,
    title,
    goal: goal || targetText,
    targetText,
    suggestedDue,
    requiredSubmissions,
    practiceText,
    focusTag,
    teacherNote,
    reviewTags,
    exerciseSet,
    status: "published" as const,
    createdAt: now,
    updatedAt: now,
  };

  await tasksCollection().insertOne(task);
  response.status(201).json({ task: toTaskResponse(task) });
});
