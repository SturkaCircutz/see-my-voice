import type { ScoreSet } from "../types";
import {
  questionBankPackages,
  teacherStudents,
  type AssessmentProfile,
  type StudentTaskPackage,
  type StudentTaskStep,
  type TaskSubmission,
  type TeacherStudent,
} from "./data";
import type { TaskStepProgress } from "./legacyAppTypes";
import { statusTime } from "./utils";

export function teacherStudentAttentionReasons(student: TeacherStudent) {
  // Teacher alerts combine overdue work, low scores, and pending reviews.
  const reasons = [];
  if (Number(student.overdueTasks || 0) > 0) reasons.push("Task incomplete");
  if (student.latestScore < 70) reasons.push("Recent score is low");
  if (student.trend === "Needs Attention") reasons.push("Trend needs attention");
  if (student.pendingSubmissions > 0) reasons.push("Recording awaiting review");
  return reasons;
}

export function teacherDashboardNeedsAttention(student: TeacherStudent) {
  return student.trend === "Needs Attention" || Number(student.overdueTasks || 0) > 0 || student.latestScore < 70;
}

export function commonTeacherFocusTags(students: TeacherStudent[]) {
  // Aggregate focus tags for the dashboard overview chips.
  const counts = students
    .flatMap((student) => student.focusTags)
    .reduce<Record<string, number>>((items, tag) => {
      items[tag] = (items[tag] || 0) + 1;
      return items;
    }, {});

  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([tag, count]) => ({ tag, count }));
}

export function recommendedTaskForStudent(student?: TeacherStudent): StudentTaskPackage | null {
  // Draft a simple practice pack from the selected learner profile.
  if (!student) return null;
  const bankPackage = questionBankPackages[0];
  const practiceItems = bankPackage?.items?.length ? bankPackage.items : ["我要吃饭"];
  const targetText = bankPackage?.targetText || practiceItems[0] || "我要吃饭";
  const focusTag = student.focusTags[0] || bankPackage?.focusTags?.[0] || "Teacher assigned practice";
  return {
    id: `draft-task-${student.id}`,
    title: "Personalized Practice Pack",
    goal: `Practice ${focusTag}.`,
    status: "Draft",
    suggestedDue: "Due this week",
    requiredSubmissions: 1,
    practiceText: targetText,
    targetStudentId: student.id,
    focusTag,
    teacherNote: "Complete each step slowly, then submit the final recording to your teacher.",
    reviewTags: student.focusTags.length ? student.focusTags.slice(0, 3) : [focusTag],
    exerciseSet: [
      {
        id: "draft-listen",
        type: "Demo",
        title: "Listen to Standard Pronunciation",
        instruction: "Listen to the model pronunciation and notice the focus sound before recording.",
        targetText,
        requiredCount: 1,
        requiresSubmission: false,
        practiceItems,
        sourceMode: bankPackage ? "bank" : "custom",
        bankPackageId: bankPackage?.id,
      },
      {
        id: "draft-repeat",
        type: "Repeat",
        title: "Repeat the Focus Items",
        instruction: "Repeat each item slowly and keep the movement clear.",
        targetText,
        requiredCount: 3,
        requiresSubmission: false,
        practiceItems,
        sourceMode: bankPackage ? "bank" : "custom",
        bankPackageId: bankPackage?.id,
      },
      {
        id: "draft-submit",
        type: "Submit",
        title: "Final Recording Submission",
        instruction: "Record the final item and submit it for teacher review.",
        targetText,
        requiredCount: 1,
        requiresSubmission: true,
        practiceItems: [targetText],
        sourceMode: "custom",
      },
    ],
  };
}

export function assessmentTaskForStudent(student?: TeacherStudent, profile?: AssessmentProfile | null): StudentTaskPackage | null {
  // Entry assessment profiles become initial published practice packs.
  if (!student) return null;
  const bankPackage = questionBankPackages[0];
  return {
    id: `initial-task-${profile?.id || student.id}`,
    title: "Entry Assessment Practice Pack",
    goal: profile?.recommendation || "Start with focused pronunciation practice from the entry assessment.",
    status: "Published",
    suggestedDue: "Due this week",
    requiredSubmissions: 1,
    practiceText: bankPackage.targetText || "我要喝水",
    targetStudentId: student.id,
    focusTag: profile?.issueTags[0] || student.focusTags[0] || "Entry Assessment Reinforcement",
    teacherNote: "This task was generated from the entry assessment profile and published after teacher confirmation.",
    reviewTags: (profile?.issueTags.length ? profile.issueTags : student.focusTags).slice(0, 3),
    exerciseSet: [
      {
        id: "assessment-listen",
        type: "Demo",
        title: "Listen to Standard Pronunciation and Observe Movement",
        instruction: "Listen to the standard pronunciation and observe mouth shape, tongue position, and rhythm.",
        targetText: bankPackage.targetText,
        requiredCount: 2,
        requiresSubmission: false,
        sourceMode: "bank",
        bankPackageId: bankPackage.id,
        practiceItems: bankPackage.items,
      },
      {
        id: "assessment-focus",
        type: "Repeat",
        title: "Slow Repetition of Focus Sound",
        instruction: "Slow down the unstable focus sound from the assessment and keep the movement complete.",
        targetText: bankPackage.targetText,
        requiredCount: student.latestScore < 70 ? 5 : 3,
        requiresSubmission: false,
        sourceMode: "bank",
        bankPackageId: bankPackage.id,
        practiceItems: bankPackage.items,
      },
      {
        id: "assessment-submit",
        type: "Submit",
        title: "Full Short-Sentence Recording Submission",
        instruction: "Read the full sentence, record, and submit. The teacher will review it in the review center.",
        targetText: bankPackage.targetText,
        requiredCount: 1,
        requiresSubmission: true,
        sourceMode: "bank",
        bankPackageId: bankPackage.id,
        practiceItems: bankPackage.items,
      },
    ],
  };
}

export function assessmentProfileForStudent(profiles: AssessmentProfile[], student?: TeacherStudent) {
  // Prefer a profile tied to the selected learner, otherwise show the latest one.
  if (!profiles.length) return null;
  return [...profiles].reverse().find((profile) => profile.studentId === student?.id) || profiles[profiles.length - 1] || null;
}

export function taskPracticeItemsForExercise(exercise: StudentTaskStep, task: StudentTaskPackage) {
  // Steps can define their own item list or inherit the task practice text.
  if (exercise.practiceItems.length) return exercise.practiceItems;
  return [exercise.targetText || task.practiceText].filter(Boolean);
}

// Creates the local submission card once every task step has been completed.
export function buildTaskSubmission(task: StudentTaskPackage, progress: Record<string, TaskStepProgress>, scores: ScoreSet, submissionCount: number): TaskSubmission | null {
  const completedSteps = task.exerciseSet.filter((exercise) => progress[exercise.id]?.completed);
  if (!task.exerciseSet.length || completedSteps.length < task.exerciseSet.length) return null;
  const submitExercise = task.exerciseSet.find((exercise) => exercise.requiresSubmission) || task.exerciseSet.at(-1);
  const savedSubmitStep = submitExercise ? progress[submitExercise.id] : Object.values(progress).at(-1);
  if (!submitExercise || !savedSubmitStep) return null;
  const student = teacherStudents.find((item) => item.id === task.targetStudentId) || teacherStudents[0];
  return {
    id: `submission-${task.id}-${submissionCount + 1}`,
    taskId: task.id,
    studentId: task.targetStudentId || student.id,
    studentName: student.name,
    taskTitle: task.title,
    exerciseTitle: savedSubmitStep.exerciseTitle || submitExercise.title,
    targetText: savedSubmitStep.targetText || task.practiceText,
    heardText: savedSubmitStep.targetText || task.practiceText,
    status: "Needs Teacher Feedback",
    aiScores: savedSubmitStep.aiScores || scores,
    aiSummary: savedSubmitStep.aiSummary || "AI first-pass review is complete and waiting for teacher feedback.",
    submittedAt: statusTime(),
    recordingUrl: savedSubmitStep.recordingUrl,
  };
}

export function stepFromQuestionBank(step: StudentTaskStep, packageId: string): StudentTaskStep {
  // Selecting a bank package fills the editor step with standard content.
  const bank = questionBankPackages.find((pack) => pack.id === packageId) || questionBankPackages[0];
  return {
    ...step,
    title: bank.title,
    instruction: bank.description,
    targetText: bank.targetText,
    sourceMode: "bank",
    bankPackageId: bank.id,
    practiceItems: bank.items,
  };
}
