import type { StudentTaskPackage, TaskSubmission } from "./types";

// Default task state must stay empty. Live practice packs load after a teacher publishes them.
export const studentTaskPackages: StudentTaskPackage[] = [];

// Recording submissions are created by learners after completing an assigned task.
export const taskSubmissions: TaskSubmission[] = [];
