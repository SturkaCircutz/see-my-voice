import type { PronunciationAnalysis } from "../types";
import {
  entryAssessmentItems,
  type AssessmentProfile,
  type EntryAssessmentResult,
  type EntryAssessmentSession,
  type StudentTaskPackage,
  type StudentTaskStep,
  type TeacherStudent,
} from "./data";

export function defaultAssessmentSession(): EntryAssessmentSession {
  // Entry assessment starts inactive until the learner opens it.
  return {
    active: false,
    currentIndex: 0,
    results: [],
    completed: false,
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function cleanEditorText(value: string, fallback: string) {
  // Empty editor fields keep the original task text.
  return value.trim() || fallback;
}

export function countFromEditor(value: string | number, fallback = 1) {
  // Counts from text inputs are clamped to positive numbers.
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : fallback;
}

export function practiceItemsFromEditor(value: string) {
  // Teacher-entered item lists use one line per practice item.
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function taskDraftFromSteps(
  task: StudentTaskPackage,
  edits: Pick<StudentTaskPackage, "title" | "goal" | "teacherNote" | "exerciseSet">,
): StudentTaskPackage {
  // Merge teacher edits back into the task package preview.
  const editedItems = edits.exerciseSet.flatMap((exercise) => exercise.practiceItems).filter(Boolean);
  const firstPracticeText = editedItems[0] || edits.exerciseSet.find((exercise) => exercise.targetText)?.targetText || task.practiceText;
  return {
    ...task,
    title: cleanEditorText(edits.title, task.title),
    goal: cleanEditorText(edits.goal, task.goal),
    teacherNote: cleanEditorText(edits.teacherNote || "", task.teacherNote || ""),
    practiceText: firstPracticeText,
    requiredSubmissions: Math.max(1, edits.exerciseSet.filter((exercise) => exercise.requiresSubmission).length),
    exerciseSet: edits.exerciseSet,
  };
}

export function assessmentResultFromAnalysis(
  session: EntryAssessmentSession,
  analysisResult: PronunciationAnalysis,
): EntryAssessmentResult | null {
  // Save the current assessment item with the latest AI score.
  const item = entryAssessmentItems[session.currentIndex] || entryAssessmentItems[0];
  if (!item) return null;
  return {
    ...item,
    score: analysisResult.scores?.overall || 70,
    note: analysisResult.summary || `${item.focus} needs continued observation.`,
  };
}

export function fallbackAssessmentResult(session: EntryAssessmentSession): EntryAssessmentResult | null {
  // Fallback results keep the assessment moving when analysis is unavailable.
  const item = entryAssessmentItems[session.currentIndex] || entryAssessmentItems[0];
  if (!item) return null;
  const existingCount = session.results.length;
  return {
    ...item,
    score: Math.max(62, 86 - existingCount * 4),
    note: `${item.focus} needs continued observation.`,
  };
}

export function nextAssessmentSession(
  session: EntryAssessmentSession,
  result: EntryAssessmentResult,
): EntryAssessmentSession {
  // Advance to the next item until every assessment prompt has a result.
  const existingResults = session.results.filter((row) => row.id !== result.id);
  const results = [...existingResults, result];
  const completed = results.length >= entryAssessmentItems.length;
  return {
    active: true,
    currentIndex: completed ? Math.max(entryAssessmentItems.length - 1, 0) : Math.min(session.currentIndex + 1, entryAssessmentItems.length - 1),
    results,
    completed,
  };
}

// Converts the entry assessment session into the teacher-facing profile card.
export function buildAssessmentProfileFromSession(
  student: TeacherStudent,
  session: EntryAssessmentSession,
  existingCount: number,
): AssessmentProfile {
  const results = session.results;
  const averageScore = results.length
    ? Math.round(results.reduce((total, row) => total + Number(row.score || 0), 0) / results.length)
    : student.latestScore;
  const issueTags = results
    .filter((row) => Number(row.score || 0) < 80)
    .map((row) => row.focus)
    .slice(0, 4);
  const selectedTags = issueTags.length ? issueTags : student.focusTags;

  return {
    id: `assessment-${student.id}-${existingCount + 1}`,
    studentId: student.id,
    studentName: student.name,
    completedAt: todayKey(),
    status: "Needs Teacher Confirmation",
    overallScore: averageScore,
    issueTags: selectedTags,
    issueCategories: [...new Set(results.map((row) => row.title).filter(Boolean))],
    profileSummary: results.length
      ? `Entry assessment completed with ${results.length} items and an overall reference score of ${averageScore}. Key observations: ${selectedTags.slice(0, 2).join("、")}.`
      : `Entry assessment shows: ${student.assessmentSummary}`,
    recommendation: results.length
      ? `Start by practicing around ${selectedTags.slice(0, 2).join("、")} with short, frequent sessions. Publish the initial practice pack after teacher confirmation.`
      : "Keep short daily repetition first and observe changes in stability.",
    itemResults: results,
  };
}

export function customTeacherStep(index: number): StudentTaskStep {
  // New custom steps start blank so teachers can write their own prompt.
  return {
    id: `custom-${Date.now()}-${index + 1}`,
    type: "Practice",
    title: "New Practice Step",
    instruction: "Complete this step from your teacher.",
    targetText: "",
    requiredCount: 1,
    requiresSubmission: false,
    sourceMode: "custom",
    bankPackageId: "",
    practiceItems: [],
  };
}
