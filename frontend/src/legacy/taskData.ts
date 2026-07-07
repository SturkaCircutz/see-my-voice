import type { StudentTaskPackage, TaskSubmission } from "./types";

// Default task state must stay empty. Live practice packs are loaded from MongoDB after a teacher publishes them.
export const studentTaskPackages: StudentTaskPackage[] = [];

// Recording submissions are created by learners after completing a Mongo-backed task.
export const taskSubmissions: TaskSubmission[] = [];
