import type { Role, StudentView, TeacherView } from "./data";
import { STORAGE_KEY } from "./legacyAppConstants";
import type { StoredLegacyState } from "./legacyAppTypes";

const progressWidthClasses = [
  "w-0",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-1/2",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-3/4",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-full",
];

export function progressWidthClass(value: number) {
  const bucket = Math.min(progressWidthClasses.length - 1, Math.max(0, Math.round(value / 5)));
  return progressWidthClasses[bucket];
}

export function isRole(value: unknown): value is Role {
  return value === "guest" || value === "student" || value === "teacher";
}

export function isStudentView(value: unknown): value is StudentView {
  return [
    "home",
    "practice",
    "tasks",
    "detail",
    "progress",
    "chat",
    "account",
    "taskDetail",
    "entryAssessment",
    "toneDrill",
    "teachingClip",
  ].includes(String(value));
}

export function isTeacherView(value: unknown): value is TeacherView {
  return [
    "home",
    "students",
    "tasks",
    "assessmentEditor",
    "taskPackageEditor",
    "reviews",
    "reviewEditor",
    "chat",
    "account",
  ].includes(String(value));
}

export function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function asArray<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

// Reads old browser state defensively because users can clear or edit localStorage.
export function loadStoredLegacyState(): StoredLegacyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredLegacyState : null;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
