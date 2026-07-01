"use client";

import React from "react";
import {
  analyzePracticeAttempt,
  createPracticeAttempt,
  fetchPracticeAttempts,
} from "../api";
import { ArticulationReference } from "./ArticulationReference";
import {
  chatThreads,
  defaultScores,
  defaultSyllables,
  entryAssessmentItems,
  pinyinByText,
  questionBankPackages,
  studentNavItems,
  studentTaskPackages,
  assessmentProfiles,
  studentQuickReplies,
  teacherNavItems,
  teacherQuickReplies,
  teacherStudents,
  toneDrills,
  type AssessmentProfile,
  type ChatThread,
  type EntryAssessmentResult,
  type EntryAssessmentSession,
  type LegacySyllable,
  type Role,
  type StudentView,
  type StudentTaskPackage,
  type StudentTaskStep,
  type TaskSubmission,
  type TeacherStudent,
  type TeacherView,
} from "./data";
import type { AuthUser, PinyinDiagnosisIssue, PracticeAttempt, PronunciationAnalysis, ScoreSet } from "../types";
import { Avatar, Score } from "./ui";
import {
  appHeaderBaseClass,
  appHeaderClass,
  brandAccentClass,
  brandClass,
  brandRowClass,
  cn,
  contentBaseClass,
  contentClass,
  diagnosisCardClass,
  diagnosisCopyClass,
  diagnosisTitleClass,
  focusStatusPillClass,
  modelCardClass,
  modelCardLabelClass,
  modelCardTitleClass,
  modelKickerClass,
  panelClass,
  panelFrameClass,
  practiceItemListClass,
  practiceItemPillClass,
  screenClass,
  sectionLabelClass,
  statusPillClass,
  statusRowClass,
  syllableStatusPillClass,
  toastClass,
  toastVisibleClass,
} from "./styles";
import {
  attemptScore,
  clipSourceForUnit,
  clipSourceFor,
  getFocusSyllable,
  latestCompleteAnalysis,
  levelFromScore,
  normalizeSyllables,
  pinyinPartsFor,
  statusFromScore,
  statusTime,
  teacherViewLabel,
  threadTypeLabel,
  tonePoints,
  toneScore,
  unreadCount,
} from "./utils";

interface TeachingClipSegment {
  title: string;
  guidanceText: string;
  syllable: LegacySyllable;
  issue?: PinyinDiagnosisIssue;
  clipType: "initial" | "final";
  clipUnit: string;
  clipUrl: string;
  videoTitle: string;
  practiceWords: string[];
}

interface TeachingClipPlan {
  title: string;
  targetText: string;
  focusIssue?: PinyinDiagnosisIssue;
  targetSyllable: LegacySyllable;
  segments: TeachingClipSegment[];
}

interface TaskStepProgress {
  completed: boolean;
  completedAt: string;
  exerciseId: string;
  exerciseTitle: string;
  targetText: string;
  recordingUrl: string;
  aiScores: ScoreSet;
  aiSummary: string;
  totalItems: number;
  completedItems: number;
  items?: {
    targetText: string;
    recordingUrl: string;
    aiScores: ScoreSet;
    aiSummary: string;
    completed: boolean;
  }[];
}

type TaskProgressState = Record<string, Record<string, TaskStepProgress>>;

interface LocalAccountState {
  isLoggedIn: boolean;
  username: string;
  displayName: string;
  password: string;
}

const fallbackAnalysis: PronunciationAnalysis = {
  heardText: "Waiting for recording analysis",
  summary:
    "Enter a Chinese sentence to practice. After recording, the system will give tone, clarity, and rhythm feedback based on your pronunciation.",
  scores: defaultScores,
  syllables: defaultSyllables,
};

const primaryTeacherButtonClass = "w-full rounded-[13px] bg-[var(--navy)] text-[13px] font-extrabold text-white";
const secondaryTeacherButtonClass = "w-full rounded-xl border border-[rgba(53,84,110,0.22)] bg-white text-xs font-extrabold text-[var(--navy)]";
const teacherTaskMetaClass = "flex flex-wrap gap-1.5";
const teacherTaskMetaItemClass = "rounded-full bg-[var(--green-soft)] px-2 py-[5px] text-[10px] font-extrabold text-[var(--green)]";
const teacherScoreStripClass = "grid grid-cols-3 gap-1.5";
const teacherScorePillClass = "rounded-[9px] bg-[rgba(53,84,110,0.08)] px-1.5 py-[7px] text-center text-[10px] font-extrabold text-[var(--navy)]";
const teacherReviewHeadingClass = "grid grid-cols-[1fr_auto] items-start gap-2.5";
const teacherReviewScoreClass = "min-w-12 text-right text-lg font-black text-[var(--red)]";
const teacherTagListClass = "flex flex-wrap gap-1.5";
const teacherTagClass = "rounded-full bg-[var(--amber-soft)] px-[9px] py-1.5 text-[11px] font-bold text-[var(--amber)]";
const templateFieldClass = "grid gap-[7px] text-xs font-black text-[var(--muted)]";
const templateInputClass = "w-full rounded-xl border border-[var(--line)] bg-[#fbfaf7] px-[13px] py-3 font-extrabold leading-[1.55] text-[var(--ink)]";
const assessmentStepClass = "grid grid-cols-[42px_minmax(0,1fr)] items-start gap-3";
const assessmentStepNumberClass = "grid size-[38px] place-items-center rounded-full bg-[var(--navy)] font-black text-white";
const assessmentSectionClass = `${panelClass} grid gap-3.5`;
const teacherFilterButtonBaseClass = "min-h-[38px] rounded-[10px] bg-[#f2eee7] px-2.5 py-2 text-left text-xs font-extrabold text-[var(--navy)]";
type TeacherStudentFilter = "all" | "attention";
type RecordingContext = "practice" | "entryAssessment" | "task";
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

function progressWidthClass(value: number) {
  const bucket = Math.min(progressWidthClasses.length - 1, Math.max(0, Math.round(value / 5)));
  return progressWidthClasses[bucket];
}

function defaultAssessmentSession(): EntryAssessmentSession {
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

function cleanEditorText(value: string, fallback: string) {
  return value.trim() || fallback;
}

function countFromEditor(value: string | number, fallback = 1) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : fallback;
}

function practiceItemsFromEditor(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function taskDraftFromSteps(
  task: StudentTaskPackage,
  edits: Pick<StudentTaskPackage, "title" | "goal" | "teacherNote" | "exerciseSet">,
): StudentTaskPackage {
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

function assessmentResultFromAnalysis(
  session: EntryAssessmentSession,
  analysisResult: PronunciationAnalysis,
): EntryAssessmentResult | null {
  const item = entryAssessmentItems[session.currentIndex] || entryAssessmentItems[0];
  if (!item) return null;
  return {
    ...item,
    score: analysisResult.scores?.overall || 70,
    note: analysisResult.summary || `${item.focus} needs continued observation.`,
  };
}

function fallbackAssessmentResult(session: EntryAssessmentSession): EntryAssessmentResult | null {
  const item = entryAssessmentItems[session.currentIndex] || entryAssessmentItems[0];
  if (!item) return null;
  const existingCount = session.results.length;
  return {
    ...item,
    score: Math.max(62, 86 - existingCount * 4),
    note: `${item.focus} needs continued observation.`,
  };
}

function nextAssessmentSession(
  session: EntryAssessmentSession,
  result: EntryAssessmentResult,
): EntryAssessmentSession {
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

function buildAssessmentProfileFromSession(
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
      ? `${student.name} completed ${results.length} entry assessment items, with overall reference score ${averageScore}. Key observations: ${selectedTags.slice(0, 2).join("、")}.`
      : `${student.name}'s entry assessment shows: ${student.assessmentSummary}`,
    recommendation: results.length
      ? `Start by practicing around ${selectedTags.slice(0, 2).join("、")} with short, frequent sessions. Publish the initial practice pack after teacher confirmation.`
      : "Keep short daily repetition first and observe changes in stability.",
    itemResults: results,
  };
}

function teacherStudentAttentionReasons(student: TeacherStudent) {
  const reasons = [];
  if (Number(student.overdueTasks || 0) > 0) reasons.push("Task incomplete");
  if (student.latestScore < 70) reasons.push("Recent score is low");
  if (student.trend === "Needs Attention") reasons.push("Trend needs attention");
  if (student.pendingSubmissions > 0) reasons.push("Recording awaiting review");
  return reasons;
}

function teacherDashboardNeedsAttention(student: TeacherStudent) {
  return student.trend === "Needs Attention" || Number(student.overdueTasks || 0) > 0 || student.latestScore < 70;
}

function commonTeacherFocusTags(students: TeacherStudent[]) {
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

function recommendedTaskForStudent(student?: TeacherStudent): StudentTaskPackage | null {
  if (!student) return null;
  const baseTask = studentTaskPackages[0];
  if (!baseTask) return null;
  return {
    ...baseTask,
    id: `task-${student.id}-${baseTask.id}`,
    title: `${student.name} · ${baseTask.title}`,
    targetStudentId: student.id,
    focusTag: student.focusTags[0] || baseTask.reviewTags?.[0] || "Pronunciation Focus",
    status: "Published",
    reviewTags: student.focusTags.length ? student.focusTags.slice(0, 3) : baseTask.reviewTags,
  };
}

function assessmentTaskForStudent(student?: TeacherStudent, profile?: AssessmentProfile | null): StudentTaskPackage | null {
  if (!student) return null;
  const bankPackage = questionBankPackages[0];
  return {
    id: `initial-task-${profile?.id || student.id}`,
    title: `${profile?.studentName || student.name} · Entry Assessment Practice Pack`,
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

function assessmentProfileForStudent(profiles: AssessmentProfile[], student?: TeacherStudent) {
  if (!profiles.length) return null;
  return [...profiles].reverse().find((profile) => profile.studentId === student?.id) || profiles[profiles.length - 1] || null;
}

function taskPracticeItemsForExercise(exercise: StudentTaskStep, task: StudentTaskPackage) {
  if (exercise.practiceItems.length) return exercise.practiceItems;
  return [exercise.targetText || task.practiceText].filter(Boolean);
}

function buildTaskSubmission(task: StudentTaskPackage, progress: Record<string, TaskStepProgress>, scores: ScoreSet, submissionCount: number): TaskSubmission | null {
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

function customTeacherStep(index: number): StudentTaskStep {
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

function stepFromQuestionBank(step: StudentTaskStep, packageId: string): StudentTaskStep {
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

function diagnosisIssueSummary(issue: PinyinDiagnosisIssue, syllables: LegacySyllable[]) {
  const syllable = syllables.find((item, index) => Number(issue.index) === index);
  const character = syllable?.character || issue.practice?.[0] || "this sound";
  const toneText = issue.type === "tone" && syllable?.tone ? `Tone ${syllable.tone.replace("T", "")}` : "";
  const typeText = issue.type === "initial"
    ? "Initial"
    : issue.type === "final"
      ? "Final"
      : issue.type === "tone"
        ? "Tone"
        : "Pronunciation";

  return {
    character,
    shortIssue: toneText ? `${toneText} may need work` : `${issue.focus || typeText} may need work`,
    label: toneText || issue.focus || issue.title || "Pronunciation focus",
  };
}

function diagnosisDetailLines(issue: PinyinDiagnosisIssue) {
  return [
    issue.summary,
    issue.detail,
  ].filter(Boolean);
}

function issuePriority(issue?: PinyinDiagnosisIssue) {
  if (["initial", "final", "syllable", "missing"].includes(issue?.type || "")) return 0;
  if (issue?.type === "tone") return 1;
  return 2;
}

function teachingIssuesFor(analysis: PronunciationAnalysis) {
  return [...(analysis.pinyinDiagnosis?.issues || [])]
    .filter((issue) => issue.type !== "extra")
    .sort((left, right) => {
      const leftIndex = Number(left.index ?? 0);
      const rightIndex = Number(right.index ?? 0);
      if (leftIndex !== rightIndex) return leftIndex - rightIndex;
      return issuePriority(left) - issuePriority(right);
    });
}

function clipTargetFor(issue: PinyinDiagnosisIssue | undefined, syllable: LegacySyllable) {
  const parts = pinyinPartsFor(syllable);
  if (issue?.type === "initial" && parts.initial) return { type: "initial" as const, unit: parts.initial };
  if (issue?.type === "final" && parts.final) return { type: "final" as const, unit: parts.final };
  if (parts.final) return { type: "final" as const, unit: parts.final };
  return { type: "initial" as const, unit: parts.initial };
}

function buildTeachingClipPlan(analysis: PronunciationAnalysis, syllables: LegacySyllable[], targetText: string): TeachingClipPlan | null {
  const issues = teachingIssuesFor(analysis);
  const rows = issues.length
    ? issues.map((issue) => ({
        issue,
        syllable: syllables[Number(issue.index ?? 0)] || getFocusSyllable(syllables) || syllables[0],
      }))
    : [{
        issue: undefined,
        syllable: getFocusSyllable(syllables) || syllables[0],
      }];
  const segments = rows
    .filter((row): row is { issue?: PinyinDiagnosisIssue; syllable: LegacySyllable } => Boolean(row.syllable))
    .map(({ issue, syllable }) => {
      const target = clipTargetFor(issue, syllable);
      const label = `${target.type === "initial" ? "Initial" : "Final"} ${target.unit}`;
      return {
        title: `${syllable.character} / ${syllable.pinyin}`,
        guidanceText: issue?.summary || issue?.detail || syllable.feedback || "Use the demo video to reinforce this syllable.",
        syllable,
        issue,
        clipType: target.type,
        clipUnit: target.unit,
        clipUrl: clipSourceForUnit(target.type, target.unit),
        practiceWords: issue?.practice?.length ? issue.practice : [syllable.character, targetText].filter(Boolean),
        videoTitle: `${label} Pronunciation Demo`,
      };
    });

  if (!segments.length) return null;
  const primarySegment = segments[0];
  return {
    title: segments.length > 1
      ? `${targetText || primarySegment.title} Personalized Teaching Video`
      : `${primarySegment.title} Personalized Teaching Video`,
    targetText,
    focusIssue: primarySegment.issue,
    targetSyllable: primarySegment.syllable,
    segments,
  };
}

function scoreFillClass(score: number) {
  const level = levelFromScore(score);
  if (level === "focus") return "bg-[var(--red)]";
  if (level === "warn") return "bg-[var(--amber)]";
  return "bg-[var(--green)]";
}

function toneFillClass(tone: string) {
  const colors: Record<string, string> = {
    "1": "bg-[var(--green)]",
    "2": "bg-[#f39b54]",
    "3": "bg-[#2fa692]",
    "4": "bg-[#35546e]",
  };
  return colors[tone] || "bg-[var(--green)]";
}

// Props keep the legacy UI connected to auth and practice state owned by the app shell.
interface LegacyAppProps {
  user: AuthUser | null;
  attempts: PracticeAttempt[];
  setAttempts: React.Dispatch<React.SetStateAction<PracticeAttempt[]>>;
  onLogin: (username: string, password: string) => Promise<void> | void;
  onLogout: () => void;
}

export function LegacyApp({
  user,
  attempts,
  setAttempts,
  onLogin,
  onLogout,
}: LegacyAppProps) {
  // Role and view state decide which legacy screen is visible inside the phone shell.
  const [role, setRole] = React.useState<Role>(user ? "student" : "guest");
  const [studentView, setStudentView] = React.useState<StudentView>("practice");
  const [teacherView, setTeacherView] = React.useState<TeacherView>("home");
  const [teacherStudentFilter, setTeacherStudentFilter] = React.useState<TeacherStudentFilter>("all");
  const [targetText, setTargetText] = React.useState("我要吃饭");
  const [analysis, setAnalysis] = React.useState<PronunciationAnalysis | null>(null);
  const [assessmentSession, setAssessmentSession] = React.useState<EntryAssessmentSession>(() => defaultAssessmentSession());
  const [localAssessmentProfiles, setLocalAssessmentProfiles] = React.useState<AssessmentProfile[]>(assessmentProfiles);
  const [recording, setRecording] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [toast, setToast] = React.useState("");
  const [selectedSyllableId, setSelectedSyllableId] = React.useState("fan");
  const [selectedStudentId, setSelectedStudentId] = React.useState(teacherStudents[0]?.id || "");
  const [localTeacherStudents, setLocalTeacherStudents] = React.useState<TeacherStudent[]>(teacherStudents);
  const [editingStudentSummaryId, setEditingStudentSummaryId] = React.useState("");
  const [selectedToneDrill, setSelectedToneDrill] = React.useState("3");
  const [practiceBackView, setPracticeBackView] = React.useState<"" | "toneDrill">("");
  const [publishedTasks, setPublishedTasks] = React.useState<StudentTaskPackage[]>([]);
  const [taskSubmissions, setTaskSubmissions] = React.useState<TaskSubmission[]>([]);
  const [taskStepProgress, setTaskStepProgress] = React.useState<TaskProgressState>({});
  const [selectedTaskId, setSelectedTaskId] = React.useState("");
  const [activeTaskExerciseId, setActiveTaskExerciseId] = React.useState("");
  const [activeTaskItemIndex, setActiveTaskItemIndex] = React.useState(0);
  const [selectedReviewId, setSelectedReviewId] = React.useState("");
  const [accountAvatar, setAccountAvatar] = React.useState("");
  const [localChatThreads, setLocalChatThreads] = React.useState<ChatThread[]>(chatThreads);
  const [lastRecordingUrl, setLastRecordingUrl] = React.useState("");
  const [localAccount, setLocalAccount] = React.useState<LocalAccountState>({
    isLoggedIn: false,
    username: "",
    displayName: "Chen Xiaohe",
    password: "",
  });
  const [teachingClipPlan, setTeachingClipPlan] = React.useState<TeachingClipPlan | null>(null);
  const [selectedClipSegmentIndex, setSelectedClipSegmentIndex] = React.useState(0);
  // Recording and toast refs hold browser objects that should not trigger rerenders.
  const mediaRecorder = React.useRef<MediaRecorder | null>(null);
  const chunks = React.useRef<Blob[]>([]);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingUrlRef = React.useRef("");
  const recordingContextRef = React.useRef<RecordingContext>("practice");
  const activeTaskRecordingRef = React.useRef<{ taskId: string; exerciseId: string; itemIndex: number } | null>(null);

  React.useEffect(() => {
    // A signed-in visitor should land in the student flow instead of the guest role picker.
    if (user && role === "guest") setRole("student");
  }, [role, user]);

  React.useEffect(() => {
    // Clean up timers and microphone capture if the legacy app unmounts.
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (mediaRecorder.current?.state === "recording") mediaRecorder.current.stop();
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    };
  }, []);

  // Derived practice data falls back to the latest completed attempt or demo values.
  const activeAnalysis = analysis || latestCompleteAnalysis(attempts) || fallbackAnalysis;
  const scores = activeAnalysis.scores || defaultScores;
  const syllables = normalizeSyllables(activeAnalysis.syllables);
  const hasAssessmentProfile = localAssessmentProfiles.length > assessmentProfiles.length || assessmentSession.completed;
  const selectedSyllable =
    syllables.find((item) => item.id === selectedSyllableId) || syllables[0] || defaultSyllables[0];
  const pinyin = pinyinByText[targetText] || (analysis ? activeAnalysis.heardText : "Waiting for recording analysis");
  const streak = Math.max(1, Math.min(9, attempts.length || 1));

  // Toasts are intentionally short-lived so action feedback does not cover the UI.
  function showToast(messageText: string) {
    setToast(messageText);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }

  // Switching roles also resets that role to its default landing page.
  function selectRole(nextRole: Exclude<Role, "guest">) {
    setRole(nextRole);
    setPracticeBackView("");
    if (nextRole === "student") setStudentView("practice");
    else setTeacherView("home");
  }

  function switchAccountRole(nextRole: Exclude<Role, "guest">) {
    setRole(nextRole);
    setPracticeBackView("");
    if (nextRole === "student") setStudentView("account");
    else setTeacherView("account");
  }

  function loginLocalAccount(nextRole: Exclude<Role, "guest">, username: string, password: string) {
    setLocalAccount({
      isLoggedIn: true,
      username,
      displayName: username || localAccount.displayName || "User",
      password,
    });
    setRole(nextRole);
    setPracticeBackView("");
    if (nextRole === "teacher") {
      setTeacherView("home");
    } else {
      setStudentView("practice");
    }
    showToast(nextRole === "teacher" ? "Logged in as teacher." : "Logged in as learner.");
  }

  function logoutLocalAccount() {
    setLocalAccount((current) => ({ ...current, isLoggedIn: false }));
    showToast("Logged out.");
  }

  // Start microphone capture, then submit the collected blob when recording stops.
  async function startRecording(context: RecordingContext = "practice") {
    setMessage("");
    if (!user) {
      setStudentView("account");
      showToast("Log in before recording.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("This browser does not support microphone recording.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    const recorder = new MediaRecorder(stream);
    // MediaRecorder delivers audio in chunks until the user taps finish.
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
      const recordingUrl = URL.createObjectURL(blob);
      recordingUrlRef.current = recordingUrl;
      setLastRecordingUrl(recordingUrl);
      void submitRecording(blob, recordingContextRef.current);
    });
    mediaRecorder.current = recorder;
    recordingContextRef.current = context;
    recorder.start();
    setRecording(true);
  }

  // Stopping the recorder triggers the submit handler registered in startRecording.
  function stopRecording() {
    if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") return;
    mediaRecorder.current.stop();
    setRecording(false);
  }

  // Create an attempt first, then replace it with the analyzed result from the API.
  async function submitRecording(blob: Blob, context: RecordingContext = "practice") {
    setBusy(true);
    let createdAttemptId = "";
    try {
      const { attempt } = await createPracticeAttempt(targetText);
      createdAttemptId = attempt.id;
      setAttempts((current) => [attempt, ...current]);

      const payload = await analyzePracticeAttempt(attempt.id, blob);
      setAnalysis(payload.analysis);
      setSelectedSyllableId(payload.analysis.syllables[0]?.id || selectedSyllableId);
      if (context === "entryAssessment") {
        completeAssessmentItem(assessmentResultFromAnalysis(assessmentSession, payload.analysis));
        setTeachingClipPlan(null);
        setSelectedClipSegmentIndex(0);
      } else if (context === "task") {
        completeTaskRecording(payload.analysis, recordingUrlRef.current);
        setTeachingClipPlan(null);
        setSelectedClipSegmentIndex(0);
      } else {
        setTeachingClipPlan(buildTeachingClipPlan(payload.analysis, normalizeSyllables(payload.analysis.syllables), targetText));
        setSelectedClipSegmentIndex(0);
      }
      setAttempts((current) => [
        payload.attempt,
        ...current.filter((item) => item.id !== payload.attempt.id),
      ]);
      setMessage("");
      showToast(context === "entryAssessment" ? "This item is recorded. Continue to the next item." : "Analysis complete.");
    } catch (error) {
      // If analysis failed after creation, refresh attempts so pending state stays honest.
      if (createdAttemptId) {
        fetchPracticeAttempts()
          .then((payload) => setAttempts(payload.attempts))
          .catch(() => undefined);
      }
      setAnalysis(fallbackAnalysis);
      setTeachingClipPlan(null);
      setSelectedClipSegmentIndex(0);
      if (context === "entryAssessment") {
        completeAssessmentItem(fallbackAssessmentResult(assessmentSession));
        showToast("This item is recorded. Continue to the next item.");
      } else if (context === "task") {
        completeTaskRecording(fallbackAnalysis, recordingUrlRef.current);
        showToast("This step is saved. Continue to the next step.");
      }
      setMessage(error instanceof Error ? error.message : "Analysis failed. Check whether the API is configured.");
    } finally {
      setBusy(false);
    }
  }

  // Browser speech synthesis provides the quick reference playback for the target text.
  function playReference() {
    if (!("speechSynthesis" in window)) {
      setMessage("This browser cannot play the reference pronunciation.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(targetText);
    utterance.lang = "zh-CN";
    utterance.rate = 0.78;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function replayRecording() {
    if (!lastRecordingUrl) return;
    const audio = new Audio(lastRecordingUrl);
    audio.play().catch(() => setMessage("This browser could not replay the last recording."));
  }

  function openTeachingClip() {
    const plan = teachingClipPlan || buildTeachingClipPlan(activeAnalysis, syllables, targetText);
    if (!plan) {
      showToast("This analysis did not find an item that needs a clip.");
      return;
    }
    setTeachingClipPlan(plan);
    setSelectedClipSegmentIndex(0);
    setStudentView("teachingClip");
    showToast("Generated personalized teaching clip.");
  }

  function startEntryAssessment() {
    const nextSession = defaultAssessmentSession();
    setAssessmentSession({ ...nextSession, active: true });
    setTargetText(entryAssessmentItems[0]?.prompt || targetText);
    setAnalysis(null);
    setTeachingClipPlan(null);
    setSelectedClipSegmentIndex(0);
    setStudentView("entryAssessment");
    showToast("Entry assessment started. Record each item one by one.");
  }

  function completeAssessmentItem(result: EntryAssessmentResult | null) {
    if (!result) return;
    const nextSession = nextAssessmentSession(assessmentSession, result);
    const nextItem = entryAssessmentItems[nextSession.currentIndex];
    setAssessmentSession(nextSession);
    if (nextItem) setTargetText(nextItem.prompt);
  }

  function completeEntryAssessment() {
    const student = localTeacherStudents.find((item) => item.id === selectedStudentId) || localTeacherStudents[0];
    if (!student) return;
    const nextProfile = buildAssessmentProfileFromSession(student, assessmentSession, localAssessmentProfiles.length);
    setLocalAssessmentProfiles((current) => [...current, nextProfile].slice(-40));
    setAssessmentSession((current) => ({ ...current, active: false, completed: true }));
    setStudentView("practice");
    showToast("Entry assessment profile generated. Waiting for teacher confirmation.");
  }

  // Reset only the current practice feedback; account and attempt history stay intact.
  function resetPractice() {
    setAnalysis(null);
    setMessage("");
    setPracticeBackView("");
    setSelectedSyllableId("fan");
    setTeachingClipPlan(null);
    setSelectedClipSegmentIndex(0);
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = "";
    setLastRecordingUrl("");
    showToast("Practice reset.");
  }

  function openStudentTask(taskId: string) {
    setSelectedTaskId(taskId);
    setActiveTaskExerciseId("");
    setActiveTaskItemIndex(0);
    setStudentView("taskDetail");
  }

  function openTaskStep(taskId: string, exerciseId: string) {
    setSelectedTaskId(taskId);
    setActiveTaskExerciseId(exerciseId);
    setActiveTaskItemIndex(0);
    setStudentView("taskDetail");
  }

  function returnToTaskSteps() {
    setActiveTaskExerciseId("");
    setActiveTaskItemIndex(0);
    setStudentView("taskDetail");
  }

  function openTeacherReview(submissionId: string) {
    setSelectedReviewId(submissionId);
    setTeacherView("reviewEditor");
  }

  function completeTaskRecording(analysisResult: PronunciationAnalysis, recordingUrl: string) {
    const context = activeTaskRecordingRef.current;
    if (!context) return;
    const task = publishedTasks.find((item) => item.id === context.taskId);
    const exercise = task?.exerciseSet.find((item) => item.id === context.exerciseId);
    if (!task || !exercise) return;
    const practiceItems = taskPracticeItemsForExercise(exercise, task);
    const target = practiceItems[context.itemIndex] || exercise.targetText || task.practiceText;
    const itemProgress = {
      targetText: target,
      recordingUrl,
      aiScores: analysisResult.scores || defaultScores,
      aiSummary: analysisResult.summary || `Saved "${target}". Continue to the next item.`,
      completed: true,
    };

    setTaskStepProgress((current) => {
      const currentTask = current[task.id] || {};
      const currentStep = currentTask[exercise.id];
      const items = [...(currentStep?.items || [])];
      items[context.itemIndex] = itemProgress;
      const completedItems = items.filter((item) => item?.completed).length;
      return {
        ...current,
        [task.id]: {
          ...currentTask,
          [exercise.id]: {
            completed: completedItems >= Math.max(practiceItems.length, 1),
            completedAt: statusTime(),
            exerciseId: exercise.id,
            exerciseTitle: exercise.title,
            targetText: target,
            recordingUrl,
            aiScores: analysisResult.scores || defaultScores,
            aiSummary: analysisResult.summary || `Saved "${exercise.title}". Continue to the next step.`,
            totalItems: practiceItems.length || 1,
            completedItems,
            items,
          },
        },
      };
    });
    setActiveTaskItemIndex((current) => Math.min(current + 1, Math.max(practiceItems.length - 1, 0)));
    showToast("This step is saved. Continue to the next step.");
  }

  function recordTaskStep(taskId: string, exerciseId: string, itemIndex: number) {
    if (recording) {
      stopRecording();
      return;
    }
    const task = publishedTasks.find((item) => item.id === taskId);
    const exercise = task?.exerciseSet.find((item) => item.id === exerciseId);
    if (!task || !exercise) return;
    const practiceItems = taskPracticeItemsForExercise(exercise, task);
    const target = practiceItems[itemIndex] || exercise.targetText || task.practiceText;
    if (!target.trim()) {
      showToast("This practice pack does not have a recordable target sentence yet.");
      return;
    }
    activeTaskRecordingRef.current = { taskId, exerciseId, itemIndex };
    setSelectedTaskId(taskId);
    setActiveTaskExerciseId(exerciseId);
    setActiveTaskItemIndex(itemIndex);
    setTargetText(target);
    void startRecording("task").then(() => showToast("Recording. Read the practice pack target sentence."));
  }

  function replayTaskRecording(taskId: string, exerciseId: string, itemIndex: number) {
    const step = taskStepProgress[taskId]?.[exerciseId];
    const recordingUrl = step?.items?.[itemIndex]?.recordingUrl || step?.recordingUrl || lastRecordingUrl;
    if (!recordingUrl) return;
    const audio = new Audio(recordingUrl);
    audio.play().catch(() => setMessage("This browser could not replay the last recording."));
  }

  function submitTaskToTeacher(taskId: string) {
    const task = publishedTasks.find((item) => item.id === taskId);
    if (!task) return;
    const submission = buildTaskSubmission(task, taskStepProgress[task.id] || {}, scores, taskSubmissions.length);
    if (!submission) {
      showToast("Complete all task steps first.");
      return;
    }
    setTaskSubmissions((current) => [
      ...current.filter((item) => item.taskId !== task.id),
      submission,
    ]);
    setSelectedReviewId(submission.id);
    showToast("Task submitted to teacher.");
  }

  function saveTeacherReview(submissionId: string, teacherScore: number, feedback: string) {
    setTaskSubmissions((current) =>
      current.map((submission) =>
        submission.id === submissionId
          ? {
              ...submission,
              status: "Teacher Reviewed",
              reviewedAt: statusTime(),
              teacherScore,
              teacherFeedback: feedback || "This is improving. Keep practicing with the teacher's suggestion.",
            }
          : submission,
      ),
    );
    setTeacherView("reviews");
    showToast("Teacher feedback saved. The learner can see it.");
  }

  function publishTask(task: StudentTaskPackage | null) {
    if (!task) return;
    setPublishedTasks((current) => [
      ...current.filter((item) => item.targetStudentId !== task.targetStudentId),
      task,
    ]);
    setTeacherView("tasks");
    showToast("Teacher-reviewed practice task published to learner.");
  }

  function confirmAssessmentProfile(profileId: string) {
    setLocalAssessmentProfiles((current) =>
      current.map((profile) => profile.id === profileId ? { ...profile, status: "Teacher Confirmed" } : profile),
    );
  }

  function editStudentSummary(studentId: string) {
    setEditingStudentSummaryId(studentId);
    showToast("Stage note is ready to edit.");
  }

  function saveStudentSummary(studentId: string, summary: string) {
    const nextSummary = summary.trim();
    if (!nextSummary) return;
    setLocalTeacherStudents((current) =>
      current.map((student) => student.id === studentId ? { ...student, assessmentSummary: nextSummary } : student),
    );
    setEditingStudentSummaryId("");
    showToast("Learning profile note saved.");
  }

  function navigateTeacher(view: TeacherView, filter?: TeacherStudentFilter) {
    setTeacherView(view);
    if (filter) setTeacherStudentFilter(filter);
  }

  function navigateStudent(view: StudentView) {
    if (view === "practice") setPracticeBackView("");
    setStudentView(view);
  }

  // Route the legacy single-page experience based on role and current tab.
  let screen: React.ReactNode;
  if (role === "guest") {
    screen = <HomeScreen onSelectRole={selectRole} />;
  } else if (role === "teacher") {
    if (teacherView === "account") {
      screen = (
        <AccountScreen
          role={role}
          user={user}
          attempts={attempts}
          publishedTasks={publishedTasks}
          chatThreads={localChatThreads}
          avatarDataUrl={accountAvatar}
          localAccount={localAccount}
          onRoleChange={switchAccountRole}
          onLogin={onLogin}
          onLocalLogin={loginLocalAccount}
          onLogout={user ? onLogout : logoutLocalAccount}
          onAvatarChange={setAccountAvatar}
        />
      );
    } else if (teacherView === "chat") {
      screen = <ChatScreen teacher threads={localChatThreads} onThreadsChange={setLocalChatThreads} avatarDataUrl={accountAvatar} />;
    } else if (teacherView === "reviewEditor") {
      screen = (
        <TeacherReviewEditorScreen
          submission={taskSubmissions.find((submission) => submission.id === selectedReviewId)}
          onBack={() => setTeacherView("reviews")}
          onSaveReview={saveTeacherReview}
        />
      );
    } else {
      screen = (
        <TeacherScreen
          view={teacherView}
          selectedStudentId={selectedStudentId}
          studentFilter={teacherStudentFilter}
          students={localTeacherStudents}
          editingStudentSummaryId={editingStudentSummaryId}
          publishedTasks={publishedTasks}
          taskSubmissions={taskSubmissions}
          onSelectStudent={setSelectedStudentId}
          onStudentFilter={setTeacherStudentFilter}
          onTeacherView={navigateTeacher}
          onOpenReview={openTeacherReview}
          assessmentProfiles={localAssessmentProfiles}
          onPublishTask={publishTask}
          onConfirmAssessment={confirmAssessmentProfile}
          onEditStudentSummary={editStudentSummary}
          onSaveStudentSummary={saveStudentSummary}
        />
      );
    }
  } else if (studentView === "account") {
    screen = (
      <AccountScreen
        role={role}
        user={user}
        attempts={attempts}
        publishedTasks={publishedTasks}
        chatThreads={localChatThreads}
        avatarDataUrl={accountAvatar}
        localAccount={localAccount}
        onRoleChange={switchAccountRole}
        onLogin={onLogin}
        onLocalLogin={loginLocalAccount}
        onLogout={user ? onLogout : logoutLocalAccount}
        onAvatarChange={setAccountAvatar}
      />
    );
  } else if (studentView === "detail") {
    screen = (
      <DetailScreen
        syllable={selectedSyllable}
        onBack={() => navigateStudent("practice")}
        onPlay={playReference}
      />
    );
  } else if (studentView === "progress") {
    screen = (
      <ProgressScreen
        attempts={attempts}
        onBack={() => navigateStudent("practice")}
        onOpenToneDrill={(tone) => {
          setSelectedToneDrill(tone);
          setStudentView("toneDrill");
        }}
      />
    );
  } else if (studentView === "tasks") {
    screen = (
      <StudentTasksScreen
        tasks={publishedTasks}
        submissions={taskSubmissions}
        progress={taskStepProgress}
        onPractice={() => navigateStudent("practice")}
        onOpenTask={openStudentTask}
      />
    );
  } else if (studentView === "taskDetail") {
    screen = (
      <StudentTaskDetailScreen
        scores={scores}
        tasks={publishedTasks}
        submissions={taskSubmissions}
        progress={taskStepProgress}
        selectedTaskId={selectedTaskId}
        activeExerciseId={activeTaskExerciseId}
        activeItemIndex={activeTaskItemIndex}
        recording={recording}
        busy={busy}
        onBackToList={() => setStudentView("tasks")}
        onPractice={() => navigateStudent("practice")}
        onOpenStep={openTaskStep}
        onBackToSteps={returnToTaskSteps}
        onTaskItem={setActiveTaskItemIndex}
        onRecordStep={recordTaskStep}
        onReplayStep={replayTaskRecording}
        onSubmitTask={submitTaskToTeacher}
      />
    );
  } else if (studentView === "chat") {
    screen = <ChatScreen teacher={false} threads={localChatThreads} onThreadsChange={setLocalChatThreads} avatarDataUrl={accountAvatar} />;
  } else if (studentView === "entryAssessment") {
    screen = (
      <EntryAssessmentScreen
        session={assessmentSession}
        recording={recording}
        busy={busy}
        onRecord={recording ? stopRecording : () => startRecording("entryAssessment")}
        onComplete={completeEntryAssessment}
      />
    );
  } else if (studentView === "toneDrill") {
    screen = (
      <ToneDrillScreen
        tone={selectedToneDrill}
        onBack={() => setStudentView("progress")}
        onChooseWord={(word) => {
          setTargetText(word);
          setPracticeBackView("toneDrill");
          setStudentView("practice");
        }}
      />
    );
  } else if (studentView === "teachingClip") {
    screen = (
      <TeachingClipScreen
        plan={teachingClipPlan}
        selectedIndex={selectedClipSegmentIndex}
        onBack={() => navigateStudent("practice")}
        onPrevious={() => setSelectedClipSegmentIndex((current) => Math.max(0, current - 1))}
        onNext={() => setSelectedClipSegmentIndex((current) => Math.min((teachingClipPlan?.segments.length || 1) - 1, current + 1))}
        onSetText={(text) => {
          setTargetText(text);
          setStudentView("practice");
        }}
      />
    );
  } else {
    screen = (
      <PracticeScreen
        targetText={targetText}
        pinyin={pinyin}
        message={message}
        busy={busy}
        recording={recording}
        analysis={activeAnalysis}
        scores={scores}
        syllables={syllables}
        streak={streak}
        showEntryAssessment={Boolean(user) && !hasAssessmentProfile}
        practiceBackView={practiceBackView}
        hasRecording={Boolean(lastRecordingUrl)}
        onTextChange={setTargetText}
        onBackToToneBank={() => setStudentView("toneDrill")}
        onRecord={recording ? stopRecording : startRecording}
        onPlay={playReference}
        onReplay={replayRecording}
        onReset={resetPractice}
        onOpenProgress={() => setStudentView("progress")}
        onOpenAssessment={startEntryAssessment}
        onOpenTeachingClip={openTeachingClip}
        onSelectSyllable={(id) => {
          setSelectedSyllableId(id);
          setStudentView("detail");
        }}
      />
    );
  }

  return (
    // The phone shell remains constant while the routed screen and nav change inside it.
    <PhoneShell>
      <main
        id="app"
        className="h-full overflow-x-hidden overflow-y-auto overscroll-contain pb-[92px] [scrollbar-color:#c7c1b8_transparent] [scrollbar-width:thin]"
        tabIndex={-1}
      >
        {screen}
      </main>
      <AppNav
        role={role}
        studentView={studentView}
        teacherView={teacherView}
        onStudentView={navigateStudent}
        onTeacherView={setTeacherView}
      />
      <div id="toast" className={cn(toastClass, toast && toastVisibleClass)} role="status" aria-live="polite">
        {toast}
      </div>
    </PhoneShell>
  );
}

// Lightweight loading view used while the app shell resolves initial data.
export function LoadingShell() {
  return (
    <PhoneShell>
      <main id="app" className="h-full overflow-x-hidden overflow-y-auto overscroll-contain pb-[92px]">
        <section className={cn(screenClass, "grid place-content-center gap-2.5 font-bold text-[var(--muted)]")}>
          <span>Loading See My Voice</span>
        </section>
      </main>
    </PhoneShell>
  );
}

// Shared frame for the mobile-style legacy screens.
function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="block min-h-screen p-0 sm:grid sm:place-items-center sm:px-4 sm:py-7">
      <div className="relative h-[100dvh] min-h-[620px] w-full overflow-hidden bg-[var(--paper)] sm:h-[min(884px,calc(100vh-56px))] sm:min-h-[690px] sm:w-[min(100%,410px)] sm:rounded-[46px] sm:border-[9px] sm:border-[var(--navy)] sm:shadow-[var(--shadow)]">
        {children}
      </div>
    </div>
  );
}

// Entry screen lets visitors choose the learner or teacher experience.
function HomeScreen({ onSelectRole }: { onSelectRole: (role: Exclude<Role, "guest">) => void }) {
  return (
    <section
      className={cn(screenClass, "flex min-h-full flex-col bg-[linear-gradient(180deg,rgba(25,26,47,0.96),rgba(25,26,47,0.92)_46%,var(--paper)_46%),var(--paper)]")}
      data-screen="home"
    >
      <header className="min-h-[315px] px-[22px] pt-[38px] pb-[30px] text-[var(--ink)]">
        <div className="mb-[21px] flex items-center justify-between text-xs font-bold tracking-[0.04em] text-[rgba(41,40,59,0.72)]">
          <span>{statusTime()}</span>
          <span>VoiceSight · See My Voice</span>
        </div>
        <div>
          <h1 className="mt-[70px] mb-2 text-[42px] font-bold tracking-normal text-[var(--red)] shadow-none [text-shadow:0_8px_24px_rgba(207,75,49,0.16)]">
            See My Voice
          </h1>
          <p className="m-0 max-w-[270px] text-[15px] font-bold leading-[1.7] text-[rgba(41,40,59,0.72)]">
            Mandarin pronunciation practice for foreign learners
          </p>
        </div>
      </header>
      <div className="grid gap-3.5 px-[18px] pb-6">
        <button
          className="grid min-h-[156px] content-start gap-2 rounded-[18px] border border-[rgba(32,154,120,0.28)] bg-[var(--surface)] p-[22px] text-left shadow-[0_18px_42px_rgba(25,26,47,0.1)]"
          type="button"
          onClick={() => onSelectRole("student")}
        >
          <span className={modelKickerClass}>Learner</span>
          <strong className="text-[25px] tracking-normal text-[var(--ink)]">Practice Today</strong>
          <p className="m-0 text-sm leading-[1.6] text-[var(--muted)]">Recording analysis, pronunciation details, teaching clips, and progress tracking.</p>
        </button>
        <button
          className="grid min-h-[156px] content-start gap-2 rounded-[18px] border border-[rgba(207,75,49,0.28)] bg-[var(--surface)] p-[22px] text-left shadow-[0_18px_42px_rgba(25,26,47,0.1)]"
          type="button"
          onClick={() => onSelectRole("teacher")}
        >
          <span className={modelKickerClass}>Teacher</span>
          <strong className="text-[25px] tracking-normal text-[var(--ink)]">Mandarin Practice Management</strong>
          <p className="m-0 text-sm leading-[1.6] text-[var(--muted)]">Learner management, practice packs, recording reviews, and feedback chat.</p>
        </button>
      </div>
    </section>
  );
}

// Header is reused by practice and progress screens with small mode differences.
function BrandHeader({
  progress = false,
  streak,
  onProgress,
}: {
  progress?: boolean;
  streak: number;
  onProgress?: () => void;
}) {
  return (
    <header className={cn(appHeaderBaseClass, progress ? "min-h-[148px]" : "min-h-[152px]")}>
      <div className="mb-[21px] flex items-center justify-between text-xs font-bold tracking-[0.04em] text-[rgba(255,255,255,0.76)]">
        <span>{statusTime()}</span>
        <span>Mandarin pronunciation practice</span>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="m-0 text-2xl font-semibold tracking-normal">
          <span className="font-[var(--serif)] text-[var(--red)]">VoiceSight</span> · {progress ? "My Progress" : "See My Voice"}
        </h1>
        {progress ? (
          <button className="min-h-9 rounded-full border border-[rgba(255,255,255,0.2)] px-[11px] py-[7px] text-xs text-[rgba(255,255,255,0.72)]" type="button">
            Recent Practice
          </button>
        ) : (
          <button className="min-h-9 py-[5px] pr-0 pl-3 text-xs text-[rgba(255,255,255,0.72)]" type="button" onClick={onProgress}>
            Streak {streak} days · Progress
          </button>
        )}
      </div>
    </header>
  );
}

interface PracticeScreenProps {
  targetText: string;
  pinyin: string;
  message: string;
  busy: boolean;
  recording: boolean;
  analysis: PronunciationAnalysis;
  scores: ScoreSet;
  syllables: LegacySyllable[];
  streak: number;
  showEntryAssessment: boolean;
  practiceBackView: "" | "toneDrill";
  hasRecording: boolean;
  onTextChange: (text: string) => void;
  onBackToToneBank: () => void;
  onRecord: () => void;
  onPlay: () => void;
  onReplay: () => void;
  onReset: () => void;
  onOpenProgress: () => void;
  onOpenAssessment: () => void;
  onOpenTeachingClip: () => void;
  onSelectSyllable: (id: string) => void;
}

// Main learner workspace for recording, reviewing scores, and opening syllable detail.
function PracticeScreen({
  targetText,
  pinyin,
  message,
  busy,
  recording,
  analysis,
  scores,
  syllables,
  streak,
  showEntryAssessment,
  practiceBackView,
  hasRecording,
  onTextChange,
  onBackToToneBank,
  onRecord,
  onPlay,
  onReplay,
  onReset,
  onOpenProgress,
  onOpenAssessment,
  onOpenTeachingClip,
  onSelectSyllable,
}: PracticeScreenProps) {
  // Copy and focus data are derived from the current recording and analysis state.
  const hasAnalysis = analysis !== fallbackAnalysis;
  const recordCopy = busy
    ? "Analyzing..."
    : recording
      ? "Recording... Tap to Finish"
      : hasAnalysis
        ? "Analysis Complete · Practice Again"
        : "Start Recording";
  const statusCopy = busy ? "Analyzing Pronunciation" : analysis === fallbackAnalysis ? "Waiting for Recording" : "Analysis Complete";
  const focusSyllable = getFocusSyllable(syllables);
  const recordButtonColor = recording
    ? "animate-pulse bg-[var(--red)]"
    : busy || hasAnalysis
      ? "bg-[var(--green)]"
      : "bg-[var(--red)]";
  const recordState = recording ? "recording" : hasAnalysis || busy ? "complete" : "idle";

  return (
    <section className={screenClass} data-screen="practice">
      <BrandHeader streak={streak} onProgress={onOpenProgress} />
      <div className={contentClass}>
        {showEntryAssessment && (
          <section className={cn(panelClass, "grid gap-[11px] border-[rgba(239,190,98,0.42)] bg-[#fffaf0]")} aria-labelledby="assessment-entry-title">
            <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
              <div>
                <span className={modelKickerClass}>Entry Assessment</span>
                <h2 className="mt-0 mb-[5px] text-base" id="assessment-entry-title">Create Your Starting Pronunciation Profile</h2>
                <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">Complete a short set of initial, final, tone, and sentence checks. The teacher can then confirm your first practice plan.</p>
              </div>
              <span className={statusPillClass}>Ready</span>
            </div>
            <button className="w-full rounded-[13px] bg-[var(--amber)] text-[13px] font-extrabold text-white" type="button" onClick={onOpenAssessment}>
              Start Entry Assessment
            </button>
          </section>
        )}

        {practiceBackView === "toneDrill" && (
          <button className="justify-self-start rounded-full border border-[rgba(53,84,110,0.12)] bg-[var(--surface)] px-3 py-2 text-xs font-extrabold text-[var(--navy)]" type="button" onClick={onBackToToneBank}>
            Back to Tone Bank
          </button>
        )}

        <section className="rounded-[20px] bg-[var(--navy)] px-4 pt-5 pb-[18px] text-center text-white" aria-labelledby="sentence-title">
          <label className="mb-2.5 block text-xs text-[rgba(255,255,255,0.45)]" htmlFor="target-text">
            Custom Practice
          </label>
          <input
            className="block w-full border-0 bg-transparent text-center font-[var(--serif)] text-[37px] leading-[1.25] font-normal tracking-[0.08em] text-white placeholder:text-[rgba(255,255,255,0.34)] focus:outline-0"
            id="target-text"
            value={targetText}
            onChange={(event) => onTextChange(event.target.value)}
            autoComplete="off"
            inputMode="text"
            lang="zh-CN"
          />
          <p className="mt-2 mb-0 text-sm tracking-[0.22em] text-[rgba(255,255,255,0.48)]">{pinyin}</p>
        </section>

        <section className={cn(modelCardClass, message ? "border-[rgba(207,75,49,0.24)] bg-[var(--red-soft)]" : "border-[rgba(32,154,120,0.26)] bg-[var(--green-soft)]")} aria-label="Pronunciation feedback status">
          <div>
            <span className={modelKickerClass}>Pronunciation Feedback</span>
            <strong className={modelCardTitleClass}>{statusCopy}</strong>
            <span className={modelCardLabelClass}>{message || `System heard: ${analysis.heardText}`}</span>
          </div>
          <span className={message ? focusStatusPillClass : statusPillClass}>{analysis === fallbackAnalysis ? "Ready" : "Complete"}</span>
        </section>

        <div className="grid grid-cols-[1fr_52px_52px_52px] gap-1.5" aria-label="Practice actions">
          <button
            className={`relative rounded-[14px] px-[18px] text-left font-bold text-white transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99] ${recordButtonColor}`}
            type="button"
            data-state={recordState}
            onClick={onRecord}
            disabled={busy || !targetText.trim()}
          >
            <span className={`mr-2 inline-block size-2 rounded-full border-2 border-current align-[1px] ${recording ? "bg-current" : ""}`}></span>
            {recordCopy}
          </button>
          <button className="rounded-[14px] border border-[#e6e1d8] bg-[#efede7] px-[5px] text-xs font-bold transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99]" type="button" onClick={onPlay}>
            Play
          </button>
          <button className="rounded-[14px] border border-[#e6e1d8] bg-[#efede7] px-[5px] text-xs font-bold transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99]" type="button" onClick={onReplay} disabled={!hasRecording}>
            Replay
          </button>
          <button className="rounded-[14px] border border-[#e6e1d8] bg-[#efede7] px-[5px] text-xs font-bold transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99]" type="button" onClick={onReset}>
            Reset
          </button>
        </div>

        <section aria-label="Pronunciation score">
          <div className="mb-[7px] grid grid-cols-[1fr_auto] items-end gap-3">
            <div>
              <span className={modelKickerClass}>Current Score</span>
              <strong className="mt-0.5 block text-lg">{scores.overall ? `${Math.round(scores.overall)} ` : "Generated After Recording"}</strong>
            </div>
          <span className="block text-[11px] font-bold text-[var(--muted)]">{hasAnalysis && focusSyllable ? `Focus: ${focusSyllable.character}` : "Tone · Clarity · Rhythm"}</span>
          </div>
          <div className="grid grid-cols-4 overflow-hidden rounded-[15px] border border-[var(--line)] bg-[var(--surface)]">
            <Score label="Overall" value={scores.overall} />
            <Score label="Tone" value={scores.tone} />
            <Score label="Clarity" value={scores.clarity} />
            <Score label="Rhythm" value={scores.rhythm} />
          </div>
        </section>

        <PinyinDiagnosisCard
          analysis={analysis}
          hasAnalysis={hasAnalysis}
          message={message}
          syllables={syllables}
          onTextChange={onTextChange}
          onOpenTeachingClip={onOpenTeachingClip}
        />

        <section aria-labelledby="feedback-title">
          <p className={sectionLabelClass} id="feedback-title">
            Syllable Feedback
          </p>
          <div className="grid gap-2">
            {syllables.map((item) => (
              <button
                className={`grid w-full grid-cols-[1fr_auto] rounded-[14px] border bg-[var(--surface)] px-3.5 py-3 text-left transition-transform duration-150 active:translate-y-px active:scale-[0.99] ${
                  item.level === "focus"
                    ? "border-[#ef8b73]"
                    : item.level === "warn"
                      ? "border-[#e8b34e]"
                      : "border-[var(--green)]"
                }`}
                type="button"
                key={item.id}
                onClick={() => onSelectSyllable(item.id)}
              >
                <span>
                  <strong className="block font-[var(--serif)] text-[30px] leading-none">{item.character}</strong>
                  <span className="mt-[5px] block text-[11px] text-[var(--muted)]">
                    {item.pinyin} · {item.tone} · {Math.round(item.score)}
                  </span>
                  <span className="mt-1.5 block text-[11px] text-[var(--muted)]">{item.feedback}</span>
                </span>
                <span className={syllableStatusPillClass(item.level)}>{item.status}</span>
              </button>
            ))}
          </div>
        </section>

        <button className="rounded-[14px] border border-[#efbe62] bg-[#fffaf0] p-3.5 text-xs leading-[1.6] text-[#8f6316]" type="button">
          Tap a syllable card to view mouth-shape guidance, tongue-position cues, tone curves, and detailed practice advice.
        </button>
      </div>
    </section>
  );
}

function PinyinDiagnosisCard({
  analysis,
  hasAnalysis,
  message,
  syllables,
  onTextChange,
  onOpenTeachingClip,
}: {
  analysis: PronunciationAnalysis;
  hasAnalysis: boolean;
  message: string;
  syllables: LegacySyllable[];
  onTextChange: (text: string) => void;
  onOpenTeachingClip: () => void;
}) {
  const diagnosis = analysis.pinyinDiagnosis;
  const issues = diagnosis?.issues || [];

  if (!diagnosis) {
    return (
      <section className={diagnosisCardClass} aria-label="Pinyin Diagnosis">
        <span className={modelKickerClass}>Pinyin Diagnosis</span>
        <strong className={diagnosisTitleClass}>{hasAnalysis ? "Analysis Result" : "Possible pronunciation issues appear after recording"}</strong>
        <p className={diagnosisCopyClass}>
          {message || (hasAnalysis
            ? analysis.summary
            : "The system uses your recording to identify initials, finals, or tones that may affect intelligibility.")}
        </p>
      </section>
    );
  }

  return (
    <section className={diagnosisCardClass} aria-label="Pinyin Diagnosis">
      <span className={modelKickerClass}>Pinyin Diagnosis</span>
      <strong className={diagnosisTitleClass}>{issues.length ? `Found ${issues.length} sound(s) to review` : diagnosis.summary}</strong>
      <p className={diagnosisCopyClass}>
        Target: {(diagnosis.targetPinyin || []).join(" ")}　Heard: {(diagnosis.heardPinyin || []).join(" ") || "Not heard clearly"}
      </p>
      {issues.length ? (
        <>
          <button className="rounded-[14px] border border-[rgba(32,154,120,0.22)] bg-[var(--green-soft)] px-3 py-2.5 text-xs font-extrabold text-[var(--green)]" type="button" onClick={onOpenTeachingClip}>
            Generate Personalized Teaching Clip
          </button>
          <div className="grid gap-2">
            {issues.map((issue, index) => {
              const summary = diagnosisIssueSummary(issue, syllables);
              const detailLines = diagnosisDetailLines(issue);
              return (
                <details className="rounded-[14px] border border-[var(--line)] bg-[#fbfaf7] p-3" key={`${issue.index ?? index}-${issue.type || "issue"}`}>
                  <summary className="grid cursor-pointer grid-cols-[auto_1fr] items-center gap-2 text-left">
                    <span className="font-[var(--serif)] text-[30px] leading-none text-[var(--red)]">{summary.character}</span>
                    <span>
                      <strong className="block text-[13px] text-[var(--ink)]">{summary.shortIssue}</strong>
                      <small className="block text-[11px] text-[var(--muted)]">{summary.label}</small>
                    </span>
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {detailLines.map((line) => (
                      <p className="m-0 text-[11px] leading-[1.55] text-[var(--muted)]" key={line}>{line}</p>
                    ))}
                    {issue.practice?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {issue.practice.map((word) => (
                          <button className={practiceItemPillClass} type="button" key={word} onClick={() => onTextChange(word)}>
                            {word}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

// Syllable detail screen combines reference media, visual tone curves, and coaching text.
function DetailScreen({
  syllable,
  onBack,
  onPlay,
}: {
  syllable: LegacySyllable;
  onBack: () => void;
  onPlay: () => void;
}) {
  // Tone curves are converted to SVG points before render.
  const targetPoints = tonePoints(syllable.targetTone);
  const currentPoints = tonePoints(syllable.currentTone);

  return (
    <section className={screenClass} data-screen="detail">
      <header className={cn(appHeaderBaseClass, "min-h-[174px]")}>
        <div className={statusRowClass}>
          <span>{statusTime()}</span>
          <span>Syllable Detail</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <button className="min-h-9 py-[5px] pr-0 pl-3 text-xs text-[rgba(255,255,255,0.72)]" type="button" onClick={onBack}>
              Back to Practice
            </button>
            <h1 className="m-0 text-xl text-white">Detailed Practice</h1>
            <p className="mt-[5px] mb-0 text-xs text-[rgba(255,255,255,0.48)]">
              {syllable.pinyin} · {syllable.tone} · Current {Math.round(syllable.score)}
            </p>
          </div>
          <div className="font-[var(--serif)] text-[64px] leading-none text-[var(--red)]" aria-hidden="true">
            {syllable.character}
          </div>
        </div>
      </header>

      <div className={contentClass}>
        <section className={cn(panelClass, "grid gap-2 border-[rgba(31,111,97,0.24)] shadow-[0_12px_28px_rgba(31,111,97,0.08)]")} aria-labelledby="detail-teaching-video-title">
          <span className={modelKickerClass}>Teaching Video</span>
          <h2 className="m-0 text-lg" id="detail-teaching-video-title">Teaching Video</h2>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{syllable.character} Personalized Teaching Video</p>
          <div className="flex gap-2 overflow-x-auto px-0 pt-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Choose a character in the sentence">
            {defaultSyllables.map((item) => (
              <button
                type="button"
                className={`grid min-h-[54px] min-w-14 flex-none place-items-center gap-0.5 rounded-2xl border px-3 py-1.5 ${
                  item.id === syllable.id
                    ? "border-[rgba(32,154,120,0.45)] bg-[var(--green-soft)] text-[var(--green)]"
                    : "border-[var(--line)] bg-white text-[var(--ink)]"
                }`}
                aria-pressed={item.id === syllable.id}
                key={item.id}
              >
                <strong className="font-[var(--serif)] text-[22px] leading-none">{item.character}</strong>
                <span className={`text-[10px] font-extrabold leading-none ${item.id === syllable.id ? "text-[var(--green)]" : "text-[var(--muted)]"}`}>{item.pinyin}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[11px] font-bold text-[var(--muted)]">
            <span>1 / 1</span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-[#eceae6]" aria-hidden="true">
            <span className="block h-full w-full rounded-[inherit] bg-[var(--red)]"></span>
          </div>
          <h3 className="m-0 text-[15px]">{syllable.character} / {syllable.pinyin}</h3>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{syllable.mouthCue}</p>
          <div className="grid gap-2.5">
            <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-[#fffaf4]">
              <p className="m-0 px-3 py-[11px] text-[11px] font-semibold text-[var(--muted)]">Pronunciation Demo</p>
              <div className="overflow-hidden rounded-[14px] bg-[#111]">
                <video className="block aspect-video w-full bg-[#111]" controls playsInline preload="metadata" poster="/assets/mouth-reference.png">
                  <source src={clipSourceFor(syllable)} type="video/mp4" />
                </video>
              </div>
              <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{syllable.tongueCue}</p>
            </div>
          </div>
        </section>

        <ArticulationReference syllable={syllable} />

        <section className={panelClass} aria-labelledby="tone-title">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="m-0 text-xs font-semibold text-[var(--muted)]" id="tone-title">Tone Comparison · Tone {syllable.tone.replace("T", "")}</h2>
            <div className="flex gap-2.5 text-[10px] text-[var(--muted)]" aria-hidden="true">
              <span className="before:mr-1 before:inline-block before:h-[3px] before:w-3.5 before:rounded-full before:bg-[var(--green)] before:align-[3px] before:content-['']">Target</span>
              <span className="before:mr-1 before:inline-block before:h-[3px] before:w-3.5 before:rounded-full before:bg-[var(--red)] before:align-[3px] before:content-['']">Yours</span>
            </div>
          </div>
          <svg className="block h-[124px] w-full" viewBox="0 0 320 124" role="img" aria-label="Target and current tone contour comparison">
            <polyline points={targetPoints} fill="none" stroke="#209a78" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={currentPoints} fill="none" stroke="#cf4b31" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </section>

        <section className={cn(panelClass, "grid gap-[5px]")} aria-label="Syllable Analysis">
          <strong className="text-[13px]">Syllable Summary</strong>
          <span className="text-xs leading-[1.55] text-[var(--muted)]">{syllable.feedback}</span>
          <span className="border-t border-[var(--line)] pt-[7px] text-xs leading-[1.55] text-[var(--muted)]">{syllable.toneCue}</span>
        </section>

        <button className="w-full rounded-[13px] bg-[var(--navy)] font-bold text-white" type="button" onClick={onPlay}>
          Replay Standard Pronunciation
        </button>
      </div>
    </section>
  );
}

// Progress view summarizes recent attempts without changing practice data.
function ProgressScreen({
  attempts,
  onBack,
  onOpenToneDrill,
}: {
  attempts: PracticeAttempt[];
  onBack: () => void;
  onOpenToneDrill: (tone: string) => void;
}) {
  const chartScores = progressChartScores(attempts);
  const chartLabels = progressChartLabels(attempts, chartScores.length);
  const latestScore = [...chartScores].reverse().find((score) => score > 0) || 0;
  const days = progressCalendarDays(attempts);

  return (
    <section className={screenClass} data-screen="progress">
      <BrandHeader progress streak={Math.max(1, attempts.length || 1)} />
      <div className={contentClass}>
        <section aria-labelledby="trend-title">
          <p className={sectionLabelClass} id="trend-title">
            Overall Score Trend
          </p>
          <div className={cn(panelClass, "pt-1.5")}>
            <ProgressTrendChart scores={chartScores} labels={chartLabels} latestScore={latestScore} />
          </div>
        </section>

        <section aria-labelledby="calendar-title">
          <p className={sectionLabelClass} id="calendar-title">
            Practice Calendar
          </p>
          <div className={cn(panelClass, "grid grid-cols-7 gap-1.5")}>
            {days.map((day) => (
              <button
                className={`grid min-h-[56px] content-center gap-0.5 rounded-xl border p-1 text-center ${
                  day.selected
                    ? "border-[var(--green)] bg-[var(--green-soft)] shadow-[inset_0_0_0_2px_rgba(32,154,120,0.28)]"
                    : day.today
                      ? "border-[var(--line)] bg-[#fbfaf7] shadow-[inset_0_0_0_2px_rgba(207,75,49,0.22)]"
                    : day.practiced
                      ? "border-[rgba(32,154,120,0.3)] bg-[var(--green-soft)]"
                      : "border-[rgba(222,216,205,0.72)] bg-[#fbfaf7]"
                }`}
                type="button"
                key={day.date}
              >
                <strong className="text-[10px] text-[var(--ink)]">{day.label}</strong>
                <span className="text-[9px] leading-[1.15] text-[var(--muted)]">{day.practiced ? "Practiced" : "No Practice"}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="words-title">
          <p className={sectionLabelClass} id="words-title">
            Daily Practice Words
          </p>
          <div className="grid gap-2">
            {attempts.length ? (
              attempts.slice(0, 6).map((attempt) => {
                const score = attemptScore(attempt);
                return (
                  <button className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-left" type="button" key={attempt.id}>
                    <span className="flex items-center justify-between gap-3">
                      <strong className="font-[var(--serif)] text-[23px]">{attempt.targetText || attempt.text}</strong>
                      <span className="text-[10px] text-[var(--muted)]">
                        {attempt.status === "complete"
                          ? `${Math.round(score)} · ${statusFromScore(score)}`
                          : attempt.status === "failed"
                            ? "Analysis Failed"
                            : "Analysis Pending"}
                      </span>
                    </span>
                    <span className="mt-2 block h-[7px] overflow-hidden rounded-full bg-[#eceae6]" aria-hidden="true">
                      <span className={cn("block h-full rounded-[inherit]", progressWidthClass(score), scoreFillClass(score))}></span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className={cn(panelClass, "m-0 text-xs leading-[1.6] text-[var(--muted)]")}>No custom practice record for this day.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="tones-title">
          <p className={sectionLabelClass} id="tones-title">
            Tone Drills
          </p>
          <div className={cn(panelClass, "grid gap-2")}>
            {Object.values(toneDrills).map((item) => (
              <button className="block w-full py-2.5 text-left" type="button" key={item.tone} onClick={() => onOpenToneDrill(item.tone)}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--red)]">{item.label}</span>
                  <span className="text-[11px] text-[var(--muted)]">{toneScore(item.tone)}</span>
                </div>
                <div className="mt-2 block h-[7px] overflow-hidden rounded-full bg-[#eceae6]" aria-hidden="true">
                  <div className={cn("block h-full rounded-[inherit]", progressWidthClass(toneScore(item.tone)), toneFillClass(item.tone))}></div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <button className="w-full rounded-[13px] bg-[var(--navy)] font-bold text-white" type="button" onClick={onBack}>
          Back to Practice Today
        </button>
      </div>
    </section>
  );
}

function progressCalendarDays(attempts: PracticeAttempt[], count = 14) {
  const practiced = new Set(
    attempts
      .map((attempt) => new Date(attempt.createdAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => date.toISOString().slice(0, 10)),
  );
  const today = new Date();
  const selectedDate = today.toISOString().slice(0, 10);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - offset));
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      label: progressDateLabel(key),
      practiced: practiced.has(key),
      today: key === selectedDate,
      selected: key === selectedDate,
    };
  });
}

function progressChartScores(attempts: PracticeAttempt[]) {
  const attemptScores = attempts
    .slice(0, 7)
    .map((attempt) => Math.round(attemptScore(attempt)))
    .reverse();
  const fallbackScores = [60, 64, 67, 70, 72, 74, 76];
  return attemptScores.length ? [...Array(Math.max(0, 7 - attemptScores.length)).fill(0), ...attemptScores] : fallbackScores;
}

function progressChartLabels(attempts: PracticeAttempt[], count: number) {
  const attemptLabels = attempts
    .slice(0, count)
    .map((attempt) => progressDateLabel(attempt.createdAt))
    .reverse();
  if (attemptLabels.length) return [...Array(Math.max(0, count - attemptLabels.length)).fill(""), ...attemptLabels];
  return recentProgressLabels(count);
}

function recentProgressLabels(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (count - 1 - index));
    return progressDateLabel(date.toISOString());
  });
}

function progressDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function ProgressTrendChart({
  scores,
  labels,
  latestScore,
}: {
  scores: number[];
  labels: string[];
  latestScore: number;
}) {
  const min = 50;
  const max = 90;
  const width = 320;
  const height = 124;
  const padding = { top: 15, right: 13, bottom: 25, left: 13 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const normalized = scores.map((score) => (score > 0 ? 100 - ((score - min) / (max - min)) * 100 : 100));
  const points = normalized.map((value, index) => {
    const x = padding.left + (innerWidth * index) / Math.max(normalized.length - 1, 1);
    const y = padding.top + (innerHeight * value) / 100;
    return { x, y, value };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg className="block h-[124px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="This week overall score line chart">
      {[0, 1, 2].map((row) => {
        const y = padding.top + (innerHeight * row) / 2;
        return <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#ece8e0" strokeWidth="1" key={row} />;
      })}
      <polyline points={polyline} fill="none" stroke="#cf4b31" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 4 : 3} fill="#cf4b31" key={`${point.x}-${point.y}`} />
      ))}
      {labels.map((label, index) => {
        const x = padding.left + (innerWidth * index) / Math.max(labels.length - 1, 1);
        return (
          <text x={x} y={height - 6} fill="#aaa6ad" fontSize="10" textAnchor="middle" key={label}>
            {label}
          </text>
        );
      })}
      <text x={width - padding.right} y="11" fill="#cf4b31" fontSize="11" fontWeight="700" textAnchor="end">
        {latestScore ? `${latestScore} ` : "No Practice"}
      </text>
    </svg>
  );
}

function EntryAssessmentScreen({
  session,
  recording,
  busy,
  onRecord,
  onComplete,
}: {
  session: EntryAssessmentSession;
  recording: boolean;
  busy: boolean;
  onRecord: () => void;
  onComplete: () => void;
}) {
  const currentIndex = Math.min(session.currentIndex || 0, entryAssessmentItems.length - 1);
  const currentItem = entryAssessmentItems[currentIndex] || entryAssessmentItems[0];
  const results = session.results;
  const completed = results.length >= entryAssessmentItems.length;
  const progress = Math.round((results.length / entryAssessmentItems.length) * 100);
  const buttonCopy = completed
    ? "Submit Assessment to Teacher"
    : busy
      ? "Analyzing..."
      : recording
        ? "Finish This Recording"
        : "Start This Recording";

  return (
    <section className={screenClass} data-screen="entry-assessment">
      <BrandHeader streak={1} />
      <div className={contentClass}>
        <section className={cn(panelClass, "grid gap-[11px] border-[rgba(239,190,98,0.42)] bg-[#fffaf0]")}>
          <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
            <div>
              <span className={modelKickerClass}>Entry Assessment</span>
              <h2 className="mt-0 mb-[5px] text-base">{completed ? "Assessment Complete" : currentItem.title}</h2>
              <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">
                {completed
                  ? "Assessment results are ready. Submit them so your teacher can confirm the first practice plan."
                  : `Please read: ${currentItem.prompt} (${currentItem.pinyin})`}
              </p>
            </div>
            <span className={statusPillClass}>
              {results.length}/{entryAssessmentItems.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(53,84,110,0.1)]" aria-hidden="true">
            <span className={cn("block h-full rounded-[inherit] bg-[var(--amber)]", progressWidthClass(progress))}></span>
          </div>
          {completed ? (
            <div className="grid gap-1 rounded-xl bg-white px-[11px] py-2.5">
              <strong className="text-xs text-[var(--amber)]">Ready to Submit</strong>
              <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">The system will use {results.length} result(s) to create a starting pronunciation profile. Your teacher can confirm it and publish a practice pack.</p>
            </div>
          ) : (
            <div className="grid gap-[5px] rounded-xl border border-[rgba(53,84,110,0.12)] bg-white p-[11px]">
              <span className={modelKickerClass}>{currentItem.type}</span>
              <strong className="text-[13px] text-[var(--ink)]">{currentItem.prompt}</strong>
              <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">Focus: {currentItem.focus}</p>
            </div>
          )}
          <button className="w-full rounded-[13px] bg-[var(--amber)] text-[13px] font-extrabold text-white" type="button" onClick={completed ? onComplete : onRecord} disabled={busy}>
            {buttonCopy}
          </button>
        </section>

        <section className={cn(panelClass, "grid gap-[9px]")}>
          <span className={modelKickerClass}>Completed Items</span>
          {results.length ? (
            results.map((result) => (
              <article className="grid gap-[5px] rounded-xl border border-[rgba(53,84,110,0.12)] bg-white p-[11px]" key={result.id}>
                <strong className="text-[13px] text-[var(--ink)]">
                  {result.prompt} · {result.score}
                </strong>
                <span className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{result.title}</span>
                <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{result.note}</p>
              </article>
            ))
          ) : (
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">No completed items yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function ToneDrillScreen({
  tone,
  onBack,
  onChooseWord,
}: {
  tone: string;
  onBack: () => void;
  onChooseWord: (word: string) => void;
}) {
  const drill = toneDrills[tone] || toneDrills["3"];

  return (
    <section className={screenClass} data-screen="tone-drill">
      <header className={cn(appHeaderBaseClass, "min-h-[220px] pt-9")}>
        <div className={statusRowClass}>
          <span>{statusTime()}</span>
          <span>Tone Drill</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-[18px]">
          <div>
            <button className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] py-0 pr-[11px] pl-2 text-xs font-bold text-[rgba(255,255,255,0.72)]" type="button" onClick={onBack} aria-label="Back to Progress">
              <span className="-translate-y-px text-[22px] leading-none text-[var(--red)]" aria-hidden="true">‹</span>
              <span>Progress</span>
            </button>
            <h1 className="mt-[18px] mb-1.5 text-[28px] leading-none text-white">{drill.label}</h1>
            <p className="m-0 max-w-[250px] text-[13px] leading-[1.55] text-[rgba(255,255,255,0.48)]">{drill.description}</p>
          </div>
          <div className="font-[var(--serif)] text-[88px] leading-[0.9] text-[var(--red)]" aria-hidden="true">
            {drill.tone}
          </div>
        </div>
      </header>
      <div className={contentClass}>
        <section className={cn(panelClass, "grid gap-[9px] rounded-[18px] p-[18px]")}>
          <span className={modelKickerClass}>Auto Question Bank</span>
          <strong className="text-[17px]">Choose a character to start a focused practice drill</strong>
          <p className="m-0 text-[13px] leading-[1.7] text-[var(--muted)]">These characters share the same tone. Select one to switch to practice, hear the standard audio, record, and review the tone contour.</p>
        </section>
        <div className="grid grid-cols-3 gap-2.5">
          {drill.words.map((word) => (
            <button className="min-h-[84px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] font-[var(--serif)] text-4xl text-[var(--ink)] shadow-[inset_0_-1px_rgba(207,200,189,0.2)] active:bg-[var(--green-soft)]" type="button" key={word} onClick={() => onChooseWord(word)}>
              {word}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeachingClipScreen({
  plan,
  selectedIndex,
  onBack,
  onPrevious,
  onNext,
  onSetText,
}: {
  plan: TeachingClipPlan | null;
  selectedIndex: number;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSetText: (text: string) => void;
}) {
  if (!plan) {
    return (
      <section className={screenClass} data-screen="teaching-clip">
        <header className={cn(appHeaderBaseClass, "min-h-[190px]")}>
          <div className={statusRowClass}>
            <span>{statusTime()}</span>
            <span>Teaching Clip</span>
          </div>
          <div>
            <button className="min-h-9 py-[5px] pr-0 pl-3 text-xs text-[rgba(255,255,255,0.72)]" type="button" onClick={onBack}>
              Back to Practice
            </button>
            <h1 className="m-0 text-xl text-white">No Teaching Clip Yet</h1>
            <p className="mt-[5px] mb-0 text-xs text-[rgba(255,255,255,0.48)]">Generated after one analysis.</p>
          </div>
        </header>
      </section>
    );
  }

  const index = Math.min(selectedIndex, Math.max(plan.segments.length - 1, 0));
  const segment = plan.segments[index] || plan.segments[0];
  const progressWidth = plan.segments.length ? ((index + 1) / plan.segments.length) * 100 : 0;

  return (
    <section className={screenClass} data-screen="teaching-clip">
      <header className={cn(appHeaderBaseClass, "min-h-[190px]")}>
        <div className={statusRowClass}>
          <span>{statusTime()}</span>
          <span>Personalized Teaching Clip</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <button className="min-h-9 py-[5px] pr-0 pl-3 text-xs text-[rgba(255,255,255,0.72)]" type="button" onClick={onBack}>
              Back to Practice
            </button>
            <h1 className="m-0 text-xl text-white">{plan.title}</h1>
            <p className="mt-[5px] mb-0 text-xs text-[rgba(255,255,255,0.48)]">Target sentence: {plan.targetText}</p>
          </div>
          <div className="font-[var(--serif)] text-[64px] leading-none text-[var(--red)]" aria-hidden="true">
            {plan.targetSyllable.character}
          </div>
        </div>
      </header>
      <div className={contentClass}>
        <section className={cn(panelClass, "grid gap-[7px]")}>
          <span className={modelKickerClass}>Current Focus</span>
          <strong className="text-[15px]">{plan.focusIssue?.title || plan.focusIssue?.focus || segment.syllable.focus}</strong>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{plan.focusIssue?.summary || segment.syllable.feedback}</p>
        </section>

        <section className={cn(panelClass, "grid gap-2")} aria-labelledby="clip-segment-title">
          <div className="flex justify-between text-[11px] font-bold text-[var(--muted)]">
            <span>{index + 1} / {plan.segments.length}</span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-[#eceae6]" aria-hidden="true">
            <span className={`block h-full rounded-[inherit] bg-[var(--red)] ${progressWidthClass(progressWidth)}`}></span>
          </div>
          <h2 className="m-0 text-lg" id="clip-segment-title">
            {segment.title}
          </h2>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{segment.guidanceText}</p>
          <div className="overflow-hidden rounded-[14px] bg-[#111]">
            <video className="block aspect-video w-full bg-[#111]" controls playsInline poster="/assets/mouth-reference.png">
              <source src={segment.clipUrl || clipSourceFor(segment.syllable, segment.clipType)} type="video/mp4" />
            </video>
          </div>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{segment.videoTitle}</p>
          <div className="flex flex-wrap gap-1.5">
            {segment.practiceWords.map((word) => (
              <button className={practiceItemPillClass} type="button" key={word} onClick={() => onSetText(word)}>
                {word}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2" aria-label="Teaching Clip Controls">
          <button className="rounded-[13px] bg-[#efede7] text-[13px] font-extrabold text-[var(--muted)] disabled:cursor-default" type="button" onClick={onPrevious} disabled={index <= 0}>Previous</button>
          <button className="rounded-[13px] bg-[#efede7] text-[13px] font-extrabold text-[var(--muted)] disabled:cursor-default" type="button" onClick={onNext} disabled={index >= plan.segments.length - 1}>Next</button>
        </div>
      </div>
    </section>
  );
}

// Student task screen shows the current assigned practice prompt.
function StudentTasksScreen({
  tasks,
  submissions,
  progress,
  onPractice,
  onOpenTask,
}: {
  tasks: StudentTaskPackage[];
  submissions: TaskSubmission[];
  progress: TaskProgressState;
  onPractice: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  return (
    <section className={screenClass} data-screen="tasks">
      <BrandHeader streak={1} />
      <div className={cn(contentBaseClass, "gap-[13px]")}>
        {tasks.length ? (
          <div className="grid gap-3" aria-label="Practice pack list">
            {tasks.map((task) => (
              <StudentTaskPackageCard task={task} submissions={submissions} progress={progress[task.id] || {}} onOpenTask={onOpenTask} key={task.id} />
            ))}
          </div>
        ) : (
          <section className={cn(panelClass, "grid min-h-[220px] content-center gap-[11px] border-[rgba(32,154,120,0.28)] bg-[#f6fffb]")}>
            <span className={modelKickerClass}>Tasks</span>
            <h2>No Practice Packs</h2>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">When your teacher publishes a practice pack, it will appear here. You can use custom practice for now.</p>
            <button className={secondaryTeacherButtonClass} type="button" onClick={onPractice}>
              Go to Custom Practice
            </button>
          </section>
        )}
      </div>
    </section>
  );
}

function StudentTaskPackageCard({
  task,
  submissions,
  progress,
  onOpenTask,
}: {
  task: StudentTaskPackage;
  submissions: TaskSubmission[];
  progress: Record<string, TaskStepProgress>;
  onOpenTask: (taskId: string) => void;
}) {
  const hasSubmission = submissions.some((submission) => submission.taskId === task.id);
  const completedCount = hasSubmission ? task.exerciseSet.length : task.exerciseSet.filter((exercise) => progress[exercise.id]?.completed).length;
  const packageLevel = hasSubmission ? "pending" : "todo";
  const packageLabel = packageLevel === "pending" ? "Waiting for Teacher Feedback" : "To Do";

  return (
    <button
      className={`${panelFrameClass} grid w-full gap-2.5 rounded-[18px] p-5 text-left text-[var(--ink)] ${
        packageLevel === "pending" ? "border-[rgba(214,126,0,0.34)]" : "border-[rgba(215,71,47,0.24)]"
      }`}
      type="button"
      onClick={() => onOpenTask(task.id)}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className={modelKickerClass}>Practice Pack</span>
        <span className={statusPillClass}>{packageLabel}</span>
      </div>
      <h2 className="m-0 text-[22px] leading-[1.25]">{task.title}</h2>
      <p className="m-0 leading-[1.55] text-[var(--muted)]">{task.goal}</p>
      <div className={teacherTaskMetaClass}>
        <span className={teacherTaskMetaItemClass}>{task.suggestedDue}</span>
        <span className={teacherTaskMetaItemClass}>
          {completedCount}/{task.exerciseSet.length} Step
        </span>
        <span className={teacherTaskMetaItemClass}>Submit {task.requiredSubmissions} recording(s)</span>
      </div>
    </button>
  );
}

function StudentTaskDetailScreen({
  scores,
  tasks,
  submissions,
  progress,
  selectedTaskId,
  activeExerciseId,
  activeItemIndex,
  recording,
  busy,
  onBackToList,
  onPractice,
  onOpenStep,
  onBackToSteps,
  onTaskItem,
  onRecordStep,
  onReplayStep,
  onSubmitTask,
}: {
  scores: ScoreSet;
  tasks: StudentTaskPackage[];
  submissions: TaskSubmission[];
  progress: TaskProgressState;
  selectedTaskId: string;
  activeExerciseId: string;
  activeItemIndex: number;
  recording: boolean;
  busy: boolean;
  onBackToList: () => void;
  onPractice: () => void;
  onOpenStep: (taskId: string, exerciseId: string) => void;
  onBackToSteps: () => void;
  onTaskItem: (index: number) => void;
  onRecordStep: (taskId: string, exerciseId: string, itemIndex: number) => void;
  onReplayStep: (taskId: string, exerciseId: string, itemIndex: number) => void;
  onSubmitTask: (taskId: string) => void;
}) {
  const task = tasks.find((item) => item.id === selectedTaskId) || tasks[0];

  return (
    <section className={screenClass} data-screen="task-detail">
      <BrandHeader streak={1} />
      <div className={cn(contentBaseClass, "gap-[13px]")}>
        {task ? (
          <StudentTaskContent
            task={task}
            scores={scores}
            submissions={submissions}
            progress={progress[task.id] || {}}
            activeExerciseId={activeExerciseId}
            activeItemIndex={activeItemIndex}
            recording={recording}
            busy={busy}
            onBackToList={onBackToList}
            onPractice={onPractice}
            onOpenStep={onOpenStep}
            onBackToSteps={onBackToSteps}
            onTaskItem={onTaskItem}
            onRecordStep={onRecordStep}
            onReplayStep={onReplayStep}
            onSubmitTask={onSubmitTask}
          />
        ) : (
          <section className={cn(panelClass, "grid min-h-[220px] content-center gap-[11px] border-[rgba(32,154,120,0.28)] bg-[#f6fffb]")}>
            <span className={modelKickerClass}>Tasks</span>
            <h2>No Practice Pack Yet</h2>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">When your teacher publishes a practice pack, today's work, submissions, and teacher feedback will appear here.</p>
            <button className={secondaryTeacherButtonClass} type="button" onClick={onPractice}>
              Go to Free Practice
            </button>
          </section>
        )}
      </div>
    </section>
  );
}

function StudentTaskContent({
  task,
  scores,
  submissions,
  progress,
  activeExerciseId,
  activeItemIndex,
  recording,
  busy,
  onBackToList,
  onPractice,
  onOpenStep,
  onBackToSteps,
  onTaskItem,
  onRecordStep,
  onReplayStep,
  onSubmitTask,
}: {
  task: StudentTaskPackage;
  scores: ScoreSet;
  submissions: TaskSubmission[];
  progress: Record<string, TaskStepProgress>;
  activeExerciseId: string;
  activeItemIndex: number;
  recording: boolean;
  busy: boolean;
  onBackToList: () => void;
  onPractice: () => void;
  onOpenStep: (taskId: string, exerciseId: string) => void;
  onBackToSteps: () => void;
  onTaskItem: (index: number) => void;
  onRecordStep: (taskId: string, exerciseId: string, itemIndex: number) => void;
  onReplayStep: (taskId: string, exerciseId: string, itemIndex: number) => void;
  onSubmitTask: (taskId: string) => void;
}) {
  const submission = submissions.find((item) => item.taskId === task.id);
  const activeExercise = task.exerciseSet.find((exercise) => exercise.id === activeExerciseId);
  const completedCount = submission ? task.exerciseSet.length : task.exerciseSet.filter((exercise) => progress[exercise.id]?.completed).length;
  const allStepsCompleted = completedCount >= task.exerciseSet.length;

  if (activeExercise) {
    const practiceItems = activeExercise.practiceItems.length ? activeExercise.practiceItems : [activeExercise.targetText || task.practiceText];
    const safeItemIndex = Math.min(Math.max(activeItemIndex, 0), Math.max(practiceItems.length - 1, 0));
    const activeItemText = practiceItems[safeItemIndex] || activeExercise.targetText || task.practiceText;
    const stepProgress = progress[activeExercise.id];
    const completedItem = stepProgress?.items?.[safeItemIndex];
    const allItemsDone = practiceItems.length > 0 && practiceItems.every((_, index) => stepProgress?.items?.[index]?.completed);
    const recordCopy = busy
      ? "Analyzing and Submitting..."
      : recording
        ? "Finish Recording and Submit"
        : completedItem
          ? "Record Again and Submit"
          : "Start Recording and Submit";
    return (
      <section className={cn(panelClass, "grid gap-3 border-[rgba(32,154,120,0.24)] bg-[linear-gradient(135deg,rgba(32,154,120,0.1),transparent_52%),#fff]")}>
        <button className={`${secondaryTeacherButtonClass} justify-self-start`} type="button" onClick={onBackToSteps}>
          Back to Tasks
        </button>
        <span className={modelKickerClass}>Step {task.exerciseSet.findIndex((exercise) => exercise.id === activeExercise.id) + 1}</span>
        <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
          <div>
            <h2 className="mt-0 mb-[5px] text-base">{activeExercise.title}</h2>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">{activeExercise.instruction}</p>
          </div>
          <span className={statusPillClass}>{stepProgress?.completed ? "Saved" : "In Progress"}</span>
        </div>
        <div className="grid gap-[5px] rounded-[13px] border border-[rgba(53,84,110,0.1)] bg-[#f8f7f3] p-3">
          <span className="text-[11px] font-black text-[var(--green)]">{activeExercise.type}</span>
          <strong className="text-2xl leading-[1.25] text-[var(--ink)]">{activeItemText}</strong>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">
            Item {safeItemIndex + 1}/{practiceItems.length || 1}. {activeExercise.requiresSubmission
              ? "These recordings will be included in the final submission to your teacher."
              : "Record and save each item separately."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {practiceItems.map((item, index) => (
              <button
                className={`min-h-[30px] rounded-full border px-3 text-xs font-black ${
                  index === safeItemIndex
                    ? "border-[var(--green)] bg-white text-[var(--green)]"
                    : stepProgress?.items?.[index]?.completed
                      ? "border-[rgba(32,154,120,0.25)] bg-[var(--green-soft)] text-[var(--green)]"
                      : "border-transparent bg-[var(--green-soft)] text-[var(--green)]"
                }`}
                type="button"
                key={item}
                onClick={() => onTaskItem(index)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2.5 rounded-[14px] border border-[rgba(32,154,120,0.18)] bg-white p-3">
          <span className={modelKickerClass}>Standard Audio and Recording</span>
          <p className="m-0 leading-[1.55] text-[var(--muted)]">Current item: {activeItemText}. Listen to the standard pronunciation, then record your practice. Feedback and visual cues will appear on this page.</p>
          <button className={secondaryTeacherButtonClass} type="button" onClick={onPractice}>
            Play Standard Pronunciation
          </button>
          <div className="grid grid-cols-[1fr_82px] gap-1.5" aria-label="Practice Pack Recording Actions">
            <button className="relative rounded-[14px] bg-[var(--red)] px-[18px] text-left font-bold text-white transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99] disabled:opacity-70" type="button" onClick={() => onRecordStep(task.id, activeExercise.id, safeItemIndex)} disabled={busy}>
              <span className="mr-2 inline-block size-2 rounded-full border-2 border-current align-[1px]"></span>{recordCopy}
            </button>
            <button className="rounded-[14px] border border-[#e6e1d8] bg-[#efede7] px-[5px] text-xs font-bold transition-[transform,background-color,border-color] duration-150 active:translate-y-px active:scale-[0.99]" type="button" onClick={() => onReplayStep(task.id, activeExercise.id, safeItemIndex)} disabled={!completedItem?.recordingUrl && !stepProgress?.recordingUrl}>
              Replay
            </button>
          </div>
        </div>
        <section className="grid gap-2.5 rounded-[14px] border border-[rgba(32,154,120,0.24)] bg-[#fbfffc] p-3" aria-label="Task Visual Feedback">
          <span className={modelKickerClass}>Visual Feedback</span>
          <p className="m-0 leading-[1.55] text-[var(--muted)]">{completedItem?.aiSummary || `After recording, the AI pinyin diagnosis and tone chart for ${activeItemText} will appear here.`}</p>
          <div className={teacherScoreStripClass} aria-label="Latest task score preview">
            <span className={teacherScorePillClass}>Tone {Math.round((completedItem?.aiScores || scores).tone)}</span>
            <span className={teacherScorePillClass}>Clarity {Math.round((completedItem?.aiScores || scores).clarity)}</span>
            <span className={teacherScorePillClass}>Rhythm {Math.round((completedItem?.aiScores || scores).rhythm)}</span>
          </div>
        </section>
        {allItemsDone && (
          <div className="grid gap-1 rounded-[13px] border border-[rgba(32,154,120,0.22)] bg-[var(--green-soft)] p-3">
            <span className={modelKickerClass}>Complete</span>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">All {practiceItems.length || 1} item(s) are saved. Return to the task steps and continue.</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <section className={cn(panelClass, "grid gap-3 border-[rgba(32,154,120,0.24)] bg-[linear-gradient(135deg,rgba(32,154,120,0.1),transparent_52%),#fff]")}>
        <span className={modelKickerClass}>Practice Pack</span>
        <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
          <div>
            <h2 className="mt-0 mb-[5px] text-base">{task.title}</h2>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">{task.goal}</p>
          </div>
          <span className={statusPillClass}>{task.status}</span>
        </div>
        <div className={teacherTaskMetaClass}>
          <span className={teacherTaskMetaItemClass}>{task.suggestedDue}</span>
          <span className={teacherTaskMetaItemClass}>Completed {completedCount}/{task.exerciseSet.length} steps</span>
          <span className={teacherTaskMetaItemClass}>Requires {task.requiredSubmissions} recording(s)</span>
        </div>
        <div className="grid gap-2.5">
          {task.exerciseSet.map((exercise, index) => (
            <button
              className={`grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border p-[13px] text-left text-[var(--ink)] ${
                progress[exercise.id]?.completed ? "border-[rgba(32,154,120,0.35)] bg-[var(--green-soft)]" : "border-[var(--line)] bg-white"
              }`}
              type="button"
              key={exercise.id}
              onClick={() => onOpenStep(task.id, exercise.id)}
            >
              <span className="grid size-[30px] place-items-center rounded-full bg-[var(--navy)] text-xs font-black text-white">{index + 1}</span>
              <span className="grid gap-1">
                <strong className="text-[15px]">{exercise.title}</strong>
                <small className="text-xs not-italic leading-[1.45] text-[var(--muted)]">{exercise.instruction}</small>
                <em className="text-xs not-italic leading-[1.45] text-[var(--muted)]">
                  {exercise.targetText || task.practiceText} · {exercise.requiredCount || 1} time(s)
                  {exercise.requiresSubmission ? " · Recording Submit" : ""}
                </em>
                <span className="mt-0.5 flex flex-wrap gap-1.5">
                  {exercise.practiceItems.map((item) => (
                    <span className="rounded-full bg-[var(--green-soft)] px-[7px] py-[3px] text-[10px] font-black text-[var(--green)]" key={item}>{item}</span>
                  ))}
                </span>
              </span>
              <b className="text-xs text-[var(--green)]">{progress[exercise.id]?.completed ? "Complete" : "Start"}</b>
            </button>
          ))}
        </div>
        <button className={primaryTeacherButtonClass} type="button" onClick={() => onSubmitTask(task.id)} disabled={!allStepsCompleted || Boolean(submission)}>
          {submission ? "Submitted to Teacher" : allStepsCompleted ? "Submit to Teacher" : "Complete All Steps to Submit"}
        </button>
      </section>

      <StudentTaskFeedback submission={submission} />

      <button className={secondaryTeacherButtonClass} type="button" onClick={onBackToList}>
        Back to Task List
      </button>
    </>
  );
}

function StudentTaskFeedback({ submission }: { submission?: TaskSubmission }) {
  const feedbackTitle = submission?.teacherFeedback
    ? `${submission.teacherScore ?? "--"} · Teacher Feedback`
    : "Teacher is reviewing";
  const feedbackBody = submission?.teacherFeedback
    || (submission
      ? "Your teacher has received the task recording. Feedback will appear here after review."
      : "Complete the tasks and submit them to receive teacher feedback here.");

  return (
    <section className={cn(panelClass, "grid gap-3 border-[rgba(210,122,0,0.24)] bg-[var(--amber-soft)]")}>
      <span className={modelKickerClass}>Task Feedback</span>
      <strong className="text-[15px] text-[var(--ink)]">{feedbackTitle}</strong>
      <p className="m-0 text-[13px] leading-[1.65] text-[var(--ink)]">{feedbackBody}</p>
      {submission && (
        <div className={teacherScoreStripClass} aria-label="AI First-Pass Scores">
          <span className={teacherScorePillClass}>Tone {submission.aiScores.tone}</span>
          <span className={teacherScorePillClass}>Clarity {submission.aiScores.clarity}</span>
          <span className={teacherScorePillClass}>Rhythm {submission.aiScores.rhythm}</span>
        </div>
      )}
      {submission && (
        <button className={secondaryTeacherButtonClass} type="button">
          Replay Submitted Recording
        </button>
      )}
    </section>
  );
}

// Teacher workspace chooses the dashboard section from the active teacher tab.
function TeacherScreen({
  view,
  selectedStudentId,
  studentFilter,
  students,
  editingStudentSummaryId,
  assessmentProfiles,
  publishedTasks,
  taskSubmissions,
  onSelectStudent,
  onStudentFilter,
  onTeacherView,
  onOpenReview,
  onPublishTask,
  onConfirmAssessment,
  onEditStudentSummary,
  onSaveStudentSummary,
}: {
  view: TeacherView;
  selectedStudentId: string;
  studentFilter: TeacherStudentFilter;
  students: TeacherStudent[];
  editingStudentSummaryId: string;
  assessmentProfiles: AssessmentProfile[];
  publishedTasks: StudentTaskPackage[];
  taskSubmissions: TaskSubmission[];
  onSelectStudent: (studentId: string) => void;
  onStudentFilter: (filter: TeacherStudentFilter) => void;
  onTeacherView: (view: TeacherView, filter?: TeacherStudentFilter) => void;
  onOpenReview: (submissionId: string) => void;
  onPublishTask: (task: StudentTaskPackage | null) => void;
  onConfirmAssessment: (profileId: string) => void;
  onEditStudentSummary: (studentId: string) => void;
  onSaveStudentSummary: (studentId: string, summary: string) => void;
}) {
  const selectedStudent = students.find((student) => student.id === selectedStudentId) || students[0];
  let body: React.ReactNode;

  // Each branch maps a nav tab to the matching teacher content panel.
  if (view === "students") {
    body = (
      <>
        <TeacherStudents
          students={students}
          selectedStudent={selectedStudent}
          filter={studentFilter}
          onFilter={onStudentFilter}
          onSelectStudent={onSelectStudent}
        />
        <TeacherProfile
          student={selectedStudent}
          editing={editingStudentSummaryId === selectedStudent?.id}
          onEdit={onEditStudentSummary}
          onSave={onSaveStudentSummary}
        />
      </>
    );
  } else if (view === "tasks") {
    body = <TeacherTasks student={selectedStudent} students={students} assessmentProfiles={assessmentProfiles} onTeacherView={onTeacherView} />;
  } else if (view === "taskPackageEditor") {
    body = <TaskPackageEditorScreen student={selectedStudent} publishedTasks={publishedTasks} onBack={() => onTeacherView("tasks")} onPublishTask={onPublishTask} />;
  } else if (view === "assessmentEditor") {
    body = (
      <AssessmentTemplateEditorScreen
        student={selectedStudent}
        assessmentProfile={assessmentProfileForStudent(assessmentProfiles, selectedStudent)}
        onBack={() => onTeacherView("tasks")}
        onPublishTask={onPublishTask}
        onConfirmAssessment={onConfirmAssessment}
      />
    );
  } else if (view === "reviews") {
    body = <TeacherReviews submissions={taskSubmissions} onOpenReview={onOpenReview} />;
  } else {
    body = <TeacherHome students={students} publishedTasks={publishedTasks} submissions={taskSubmissions} onTeacherView={onTeacherView} />;
  }

  return (
    <section className={screenClass} data-screen="teacher">
      <TeacherHeader title="Mandarin Practice Management" subtitle={teacherViewLabel(view)} />
      <div className={cn(contentBaseClass, "gap-4")}>{body}</div>
    </section>
  );
}

// Shared teacher header keeps teacher-only pages visually consistent.
function TeacherHeader({ title, subtitle, className = "" }: { title: string; subtitle: string; className?: string }) {
  return (
    <header className={cn(appHeaderBaseClass, className || "min-h-[178px]")}>
      <div className={statusRowClass}>
        <span>{statusTime()}</span>
        <span>Mandarin Practice Management</span>
      </div>
      <div className={brandRowClass}>
        <div>
          <h1 className={brandClass}>
            <span className={brandAccentClass}>VoiceSight</span> Teacher
          </h1>
          <p className="mt-[7px] mb-0 text-xs text-[rgba(255,255,255,0.54)]">
            {title} · {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}

// Teacher dashboard metrics follow the same published-task and submission state as the legacy web app.
function TeacherHome({
  students,
  publishedTasks,
  submissions,
  onTeacherView,
}: {
  students: TeacherStudent[];
  publishedTasks: StudentTaskPackage[];
  submissions: TaskSubmission[];
  onTeacherView: (view: TeacherView, filter?: TeacherStudentFilter) => void;
}) {
  const pending = submissions.filter((submission) => submission.status === "Needs Teacher Feedback").length;
  const needsAttention = students.filter(teacherDashboardNeedsAttention).length;
  const average = Math.round(
    students.reduce((sum, student) => sum + student.latestScore, 0) / Math.max(students.length, 1),
  );
  const studentCount = Math.max(students.length, 1);
  const completionRate = Math.round((new Set(submissions.map((submission) => submission.studentId)).size / studentCount) * 100);
  const taskCoverageRate = Math.round((publishedTasks.length / studentCount) * 100);
  const focusTags = commonTeacherFocusTags(students);

  return (
    <>
      <section aria-labelledby="teacher-home-title">
        <p className={sectionLabelClass} id="teacher-home-title">
          Today
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className="grid min-h-[82px] content-center gap-[5px] rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-[13px] text-left" type="button" onClick={() => onTeacherView("reviews")}>
            <strong className="text-3xl leading-none text-[var(--amber)]">{pending}</strong>
            <span className="text-[11px] font-bold text-[var(--muted)]">Recordings to Review</span>
          </button>
          <button className="grid min-h-[82px] content-center gap-[5px] rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-[13px] text-left" type="button" onClick={() => onTeacherView("students", "attention")}>
            <strong className={`text-3xl leading-none ${needsAttention ? "text-[var(--red)]" : "text-[var(--green)]"}`}>{needsAttention}</strong>
            <span className="text-[11px] font-bold text-[var(--muted)]">Needs Attention</span>
          </button>
          <button className="grid min-h-[82px] content-center gap-[5px] rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-[13px] text-left" type="button" onClick={() => onTeacherView("tasks")}>
            <strong className="text-3xl leading-none text-[var(--green)]">{publishedTasks.length}</strong>
            <span className="text-[11px] font-bold text-[var(--muted)]">Published Practice Tasks</span>
          </button>
        </div>
      </section>

      <section className={cn(panelClass, "grid gap-2.5")} aria-labelledby="teacher-class-progress-title">
        <div className={teacherReviewHeadingClass}>
          <div>
            <span className={modelKickerClass}>Class Overview</span>
            <strong className="block text-[var(--ink)]" id="teacher-class-progress-title">Practice Completion and Focus Overview</strong>
          </div>
          <span className={statusPillClass}>{students.length} learners</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
            <strong className="text-[22px] leading-none text-[var(--navy)]">{completionRate}%</strong>Submission Coverage
          </span>
          <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
            <strong className="text-[22px] leading-none text-[var(--navy)]">{taskCoverageRate}%</strong>Task Coverage
          </span>
          <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
            <strong className="text-[22px] leading-none text-[var(--navy)]">{average}</strong>Average Assessment
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#f8f5ef]" aria-label="Class submission coverage rate">
          <span className={cn("block h-full rounded-[inherit] bg-[var(--green)]", progressWidthClass(completionRate))}></span>
        </div>
        <div className="grid gap-2">
          <span className="text-[11px] font-black text-[var(--muted)]">Common Focus Areas</span>
          <div className="flex flex-wrap gap-1.5">
            {focusTags.length ? (
              focusTags.map((item) => (
                <span className="rounded-full bg-[var(--amber-soft)] px-[9px] py-1.5 text-[11px] font-bold text-[var(--amber)]" key={item.tag}>
                  {item.tag} · {item.count}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-[var(--amber-soft)] px-[9px] py-1.5 text-[11px] font-bold text-[var(--amber)]">No common issue yet</span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

// Learner list controls the selected student shown in the adjacent profile panel.
function TeacherStudents({
  students,
  selectedStudent,
  filter,
  onFilter,
  onSelectStudent,
}: {
  students: TeacherStudent[];
  selectedStudent?: TeacherStudent;
  filter: TeacherStudentFilter;
  onFilter: (filter: TeacherStudentFilter) => void;
  onSelectStudent: (studentId: string) => void;
}) {
  const visibleStudents = filter === "attention" ? students.filter((student) => teacherStudentAttentionReasons(student).length > 0) : students;
  return (
    <section aria-labelledby="teacher-students-title">
      <p className={sectionLabelClass} id="teacher-students-title">
        Learner Management
      </p>
      <div className="mt-[7px] grid gap-2" aria-label="Learner filters">
        <button className={teacherFilterButtonBaseClass} type="button" aria-current={filter === "all" ? "page" : undefined} onClick={() => onFilter("all")}>
          All Learners
        </button>
        <button className={teacherFilterButtonBaseClass} type="button" aria-current={filter === "attention" ? "page" : undefined} onClick={() => onFilter("attention")}>Needs Attention</button>
      </div>
      <div className="grid gap-2">
        {visibleStudents.length ? (
          visibleStudents.map((student) => {
            const attentionCopy = teacherStudentAttentionReasons(student).join(" / ");
            return (
              <button
                className={`grid w-full grid-cols-[1fr_auto] items-center gap-2.5 rounded-[14px] border p-[13px_14px] text-left ${
                  student.id === selectedStudent?.id
                    ? "border-[rgba(32,154,120,0.75)] bg-[var(--green-soft)] shadow-[inset_3px_0_var(--green)]"
                    : "border-[var(--line)] bg-[var(--surface)]"
                }`}
                type="button"
                key={student.id}
                onClick={() => onSelectStudent(student.id)}
              >
                <span>
                  <strong className="mb-1 block text-[15px]">{student.name}</strong>
                  <span className="block text-[11px] text-[var(--muted)]">
                    {student.stage} · {student.weeklyPracticeCount} sessions this week{attentionCopy ? ` · ${attentionCopy}` : ""}
                  </span>
                </span>
                <span className={statusPillClass}>{student.latestScore}</span>
              </button>
            );
          })
        ) : (
          <p className="m-0 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-3.5 text-xs leading-[1.6] text-[var(--muted)]">No learners currently need attention.</p>
        )}
      </div>
    </section>
  );
}

// Selected learner summary for quick teacher review.
function TeacherProfile({
  student,
  editing,
  onEdit,
  onSave,
}: {
  student?: TeacherStudent;
  editing: boolean;
  onEdit: (studentId: string) => void;
  onSave: (studentId: string, summary: string) => void;
}) {
  const [summaryDraft, setSummaryDraft] = React.useState(student?.assessmentSummary || "");

  React.useEffect(() => {
    setSummaryDraft(student?.assessmentSummary || "");
  }, [student?.id, student?.assessmentSummary, editing]);

  if (!student) return null;
  return (
    <section className={cn(panelClass, "grid gap-2.5")} aria-labelledby="teacher-report-title">
      <span className={modelKickerClass}>Learning Profile</span>
      <h2 className="m-0 text-[19px]" id="teacher-report-title">{student.name}</h2>
      <div className="grid grid-cols-3 gap-2">
        <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
          <strong className="text-[22px] leading-none text-[var(--green)]">{student.latestScore}</strong>Latest Assessment
        </span>
        <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
          <strong className="text-[22px] leading-none text-[var(--green)]">{student.weeklyPracticeCount}</strong>Weekly Sessions
        </span>
        <span className="grid gap-1 rounded-[11px] bg-[#f8f5ef] px-2 py-2.5 text-center text-[10px] font-extrabold text-[var(--muted)]">
          <strong className="text-[22px] leading-none text-[var(--green)]">{student.pendingSubmissions}</strong>Pending
        </span>
      </div>
      {editing ? (
        <form className="grid gap-2" onSubmit={(event) => event.preventDefault()}>
          <label className={templateFieldClass}>
            <span>Teacher Stage Note</span>
            <textarea className={`${templateInputClass} resize-y`} rows={3} value={summaryDraft} onChange={(event) => setSummaryDraft(event.target.value)} />
          </label>
          <button className={secondaryTeacherButtonClass} type="button" onClick={() => onSave(student.id, summaryDraft)}>
            Save Stage Note
          </button>
        </form>
      ) : (
        <div className="grid gap-2">
          <span className="text-xs font-black text-[var(--muted)]">Teacher Stage Note</span>
          <p className="m-0 rounded-[13px] border border-[var(--line)] bg-[#fbfaf7] p-[13px] text-xs font-extrabold leading-[1.6] text-[var(--ink)]">{student.assessmentSummary}</p>
          <button className={secondaryTeacherButtonClass} type="button" onClick={() => onEdit(student.id)}>
            Edit Note
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {student.focusTags.map((tag) => (
          <span className="rounded-full bg-[var(--amber-soft)] px-[9px] py-1.5 text-[11px] font-bold text-[var(--amber)]" key={tag}>{tag}</span>
        ))}
      </div>
    </section>
  );
}

// Teacher task builder preview uses the currently selected learner when available.
function TeacherTasks({
  student,
  students,
  assessmentProfiles,
  onTeacherView,
}: {
  student?: TeacherStudent;
  students: TeacherStudent[];
  assessmentProfiles: AssessmentProfile[];
  onTeacherView: (view: TeacherView) => void;
}) {
  const task = studentTaskPackages[0];
  const assessmentProfile = assessmentProfileForStudent(assessmentProfiles, student);

  return (
    <>
      <section className={cn(panelClass, "grid gap-2.5")} aria-label="Create Practice Task">
        <span className={modelKickerClass}>New Task</span>
        <strong className="text-[15px]">Create an Individual Practice Pack</strong>
        <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">Choose a learner, then edit a template using the question bank or custom steps.</p>
        <label className={templateFieldClass}>
          <span>Choose Learner</span>
          <select className={templateInputClass} defaultValue={student?.id}>
            {students.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button className={primaryTeacherButtonClass} type="button" onClick={() => onTeacherView("taskPackageEditor")}>
          Create Practice Task
        </button>
      </section>

      <section className={cn(panelClass, "grid gap-2.5")} aria-label="AI Assisted Tasks">
        <span className={modelKickerClass}>Task Center</span>
        <strong className="text-[15px]">{student?.name || "Learner"} · {task.title}</strong>
        <div className={teacherTaskMetaClass}>
          <span className={teacherTaskMetaItemClass}>{task.status}</span>
          <span className={teacherTaskMetaItemClass}>{task.exerciseSet.length} task steps</span>
          <span className={teacherTaskMetaItemClass}>{task.suggestedDue}</span>
        </div>
        <ol className="grid gap-[7px] [counter-reset:task-step] m-0 list-none p-0">
          {task.exerciseSet.map((step) => (
            <li
              className="grid grid-cols-[24px_1fr] items-center gap-2 text-xs leading-[1.45] text-[var(--ink)] before:grid before:size-6 before:place-items-center before:rounded-full before:bg-[var(--navy)] before:text-[10px] before:font-extrabold before:text-white before:[content:counter(task-step)] [counter-increment:task-step]"
              key={step.id}
            >
              {step.instruction}
            </li>
          ))}
        </ol>
        <button className={primaryTeacherButtonClass} type="button" onClick={() => onTeacherView("taskPackageEditor")}>
          Review and Edit Practice Pack
        </button>
      </section>

      <section className={cn(panelClass, "grid gap-2.5")} aria-labelledby="teacher-assessment-title">
        {assessmentProfile ? (
          <>
            <div className={teacherReviewHeadingClass}>
              <div>
                <span className={modelKickerClass}>Entry Assessment Profile</span>
                <strong className="block text-[var(--ink)]" id="teacher-assessment-title">
                  {assessmentProfile.studentName} · {assessmentProfile.status}
                </strong>
              </div>
              <span className={teacherReviewScoreClass}>{assessmentProfile.overallScore}</span>
            </div>
            <div className={teacherTaskMetaClass}>
              <span className={teacherTaskMetaItemClass}>{assessmentProfile.status}</span>
              <span className={teacherTaskMetaItemClass}>{assessmentProfile.issueTags.length} focus areas</span>
            </div>
            <button className={primaryTeacherButtonClass} type="button" onClick={() => onTeacherView("assessmentEditor")} disabled={assessmentProfile.status === "Teacher Confirmed"}>
              {assessmentProfile.status === "Teacher Confirmed" ? "Initial Task Published" : "Edit Practice Pack Template"}
            </button>
          </>
        ) : (
          <div>
            <span className={modelKickerClass}>Entry Assessment Profile</span>
            <strong className="block text-[var(--ink)]" id="teacher-assessment-title">No editable entry assessment profile yet</strong>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">After the learner completes the entry assessment, the system creates a profile for the teacher to edit into a practice pack.</p>
          </div>
        )}
      </section>
    </>
  );
}

// Recording review panel shows the teacher feedback form for pending submissions.
function TeacherReviews({
  submissions,
  onOpenReview,
}: {
  submissions: TaskSubmission[];
  onOpenReview: (submissionId: string) => void;
}) {
  const pendingSubmissions = submissions.filter((submission) => submission.status === "Needs Teacher Feedback");

  return (
    <section className={cn(panelClass, "grid gap-2.5")} aria-labelledby="teacher-review-title">
      <div className={teacherReviewHeadingClass}>
        <div>
          <span className={modelKickerClass}>Review Center</span>
          <strong className="block text-[var(--ink)]" id="teacher-review-title">Learner Recordings Waiting for Feedback</strong>
        </div>
        <span className={statusPillClass}>{pendingSubmissions.length}</span>
      </div>
      {pendingSubmissions.length ? (
        <div className="grid gap-[9px]">
          {pendingSubmissions.map((submission) => (
            <TeacherSubmissionItem submission={submission} onOpenReview={onOpenReview} key={submission.id} />
          ))}
        </div>
      ) : (
        <p className="px-0 pt-2.5 pb-0.5">Recordings from teacher-assigned tasks will appear here. Add feedback after reviewing the AI first pass.</p>
      )}
    </section>
  );
}

function TeacherSubmissionItem({
  submission,
  onOpenReview,
}: {
  submission: TaskSubmission;
  onOpenReview: (submissionId: string) => void;
}) {
  return (
    <article className="grid gap-[9px] rounded-xl border border-[rgba(207,75,49,0.18)] bg-[#fffaf6] p-3">
      <div className={teacherReviewHeadingClass}>
        <span>
          <strong className="block text-[var(--ink)]">{submission.studentName}</strong>
          <span className="mt-[3px] block text-[11px] text-[var(--muted)]">{submission.taskTitle}</span>
        </span>
        <span className={teacherReviewScoreClass}>{submission.aiScores.overall}</span>
      </div>
      <button className={primaryTeacherButtonClass} type="button" onClick={() => onOpenReview(submission.id)}>
        Edit Feedback
      </button>
    </article>
  );
}

function TaskPackageEditorScreen({
  student,
  publishedTasks,
  onBack,
  onPublishTask,
}: {
  student?: TeacherStudent;
  publishedTasks: StudentTaskPackage[];
  onBack: () => void;
  onPublishTask: (task: StudentTaskPackage | null) => void;
}) {
  const task = recommendedTaskForStudent(student);
  const alreadyPublished = Boolean(student && publishedTasks.some((item) => item.targetStudentId === student.id));
  const [exerciseSet, setExerciseSet] = React.useState<StudentTaskStep[]>(() => task?.exerciseSet || []);
  const [taskTitle, setTaskTitle] = React.useState(task?.title || "");
  const [taskGoal, setTaskGoal] = React.useState(task?.goal || "");
  const [teacherNote, setTeacherNote] = React.useState(task?.teacherNote || "Complete each step slowly, then submit the final recording to your teacher.");

  React.useEffect(() => {
    setExerciseSet(task?.exerciseSet || []);
    setTaskTitle(task?.title || "");
    setTaskGoal(task?.goal || "");
    setTeacherNote(task?.teacherNote || "Complete each step slowly, then submit the final recording to your teacher.");
  }, [task?.id]);

  function publishEditedTask() {
    if (!task) return;
    onPublishTask(taskDraftFromSteps(task, {
      title: taskTitle,
      goal: taskGoal,
      teacherNote,
      exerciseSet,
    }));
  }

  function addStep() {
    setExerciseSet((current) => [...current, customTeacherStep(current.length)]);
  }

  function deleteStep(stepId: string) {
    setExerciseSet((current) => current.length <= 1 ? current : current.filter((step) => step.id !== stepId));
  }

  function updateStep(stepId: string, update: (step: StudentTaskStep) => StudentTaskStep) {
    setExerciseSet((current) => current.map((step) => step.id === stepId ? update(step) : step));
  }

  if (!student || !task) {
    return (
      <section className={cn(panelClass, "grid gap-2.5")}>
        <span className={modelKickerClass}>Practice Pack Review</span>
        <strong>No editable practice pack yet</strong>
        <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">Choose a learner first. The system will draft a practice pack from the learner profile.</p>
        <button className={secondaryTeacherButtonClass} type="button" onClick={onBack}>
          Back to Task Center
        </button>
      </section>
    );
  }

  return (
    <section className="grid gap-3.5" aria-labelledby="task-package-editor-title">
      <button className={`${secondaryTeacherButtonClass} w-auto min-w-[132px] justify-self-start`} type="button" onClick={onBack}>
        Back to Task Center
      </button>

      <section className={cn(panelClass, "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3")}>
        <div>
          <span className={modelKickerClass}>Practice Pack Review Template</span>
          <h2 className="mt-1 mb-0 text-[22px] text-[var(--ink)]" id="task-package-editor-title">{student.name}'s Practice Task</h2>
          <p className="m-0 leading-[1.55] text-[var(--muted)]">The system only drafts the pack. Confirm the target, practice load, and learner-facing instructions before publishing.</p>
        </div>
        <span className={teacherReviewScoreClass}>{student.latestScore}</span>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>1</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Confirm Practice Target</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">Set the exact practice focus you want this learner to work on.</p>
          </div>
        </div>
        <div className={teacherTagListClass}>
          {(task.reviewTags || student.focusTags).map((tag) => (
            <span className={teacherTagClass} key={tag}>{tag}</span>
          ))}
        </div>
        <label className={templateFieldClass}>
          <span>Task Title</span>
          <input className={templateInputClass} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
        </label>
        <label className={templateFieldClass}>
          <span>Practice target shown on the learner task page</span>
          <textarea className={`${templateInputClass} resize-y`} rows={3} value={taskGoal} onChange={(event) => setTaskGoal(event.target.value)} />
        </label>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>2</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Task Steps</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">Each step can use the question bank or custom items. Learners complete the steps one by one.</p>
          </div>
        </div>
        <div className="grid gap-3">
          {exerciseSet.map((exercise, index) => (
            <TeacherStepEditor
              exercise={exercise}
              index={index}
              canDelete={exerciseSet.length > 1}
              onDelete={() => deleteStep(exercise.id)}
              onSourceMode={(mode) => updateStep(exercise.id, (step) => ({ ...step, sourceMode: mode }))}
              onBankPackage={(packageId) => updateStep(exercise.id, (step) => stepFromQuestionBank(step, packageId))}
              onChange={(update) => updateStep(exercise.id, (step) => ({ ...step, ...update }))}
              key={exercise.id}
            />
          ))}
        </div>
        <button className="grid size-[52px] justify-self-end place-items-center rounded-full bg-[var(--green)] text-[28px] font-black text-white shadow-[0_12px_28px_rgba(32,154,120,0.28)]" type="button" onClick={addStep}>+</button>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>3</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Instructions for the Learner</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">Explain why this practice matters, how to complete it, and what to notice first.</p>
          </div>
        </div>
        <label className={templateFieldClass}>
          <span>Learner Instructions</span>
          <textarea className={`${templateInputClass} resize-y`} rows={4} value={teacherNote} onChange={(event) => setTeacherNote(event.target.value)} />
        </label>
        <button className={primaryTeacherButtonClass} type="button" onClick={publishEditedTask}>
          {alreadyPublished ? "Save Changes and Republish" : "Submit to Learner"}
        </button>
      </section>
    </section>
  );
}

function AssessmentTemplateEditorScreen({
  student,
  assessmentProfile,
  onBack,
  onPublishTask,
  onConfirmAssessment,
}: {
  student?: TeacherStudent;
  assessmentProfile: AssessmentProfile | null;
  onBack: () => void;
  onPublishTask: (task: StudentTaskPackage | null) => void;
  onConfirmAssessment: (profileId: string) => void;
}) {
  const profile = assessmentProfile;
  const bankPackage = questionBankPackages[0];
  const repeatCount = (profile?.overallScore || student?.latestScore || 0) < 70 ? 5 : 3;
  const initialAssessmentExerciseSet: StudentTaskStep[] = [
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
      requiredCount: repeatCount,
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
  ];
  const [assessmentExerciseSet, setAssessmentExerciseSet] = React.useState<StudentTaskStep[]>(initialAssessmentExerciseSet);
  const [profileSummary, setProfileSummary] = React.useState(profile?.profileSummary || "");
  const [assessmentRecommendation, setAssessmentRecommendation] = React.useState(profile?.recommendation || "");
  const [assessmentTaskTitle, setAssessmentTaskTitle] = React.useState(profile ? `${profile.studentName} · Entry Assessment Practice Pack` : "");
  const [assessmentTeacherNote, setAssessmentTeacherNote] = React.useState("Your teacher adjusted this practice pack based on your entry assessment. Today, do not rush. Slow down the target sound, say it completely, and your teacher will listen again after you record.");

  React.useEffect(() => {
    setAssessmentExerciseSet(initialAssessmentExerciseSet);
    setProfileSummary(profile?.profileSummary || "");
    setAssessmentRecommendation(profile?.recommendation || "");
    setAssessmentTaskTitle(profile ? `${profile.studentName} · Entry Assessment Practice Pack` : "");
    setAssessmentTeacherNote("Your teacher adjusted this practice pack based on your entry assessment. Today, do not rush. Slow down the target sound, say it completely, and your teacher will listen again after you record.");
  }, [profile?.id]);

  function publishAssessmentTask() {
    const task = assessmentTaskForStudent(student, profile);
    if (!task) {
      onPublishTask(null);
      return;
    }
    if (profile) onConfirmAssessment(profile.id);
    onPublishTask(taskDraftFromSteps(
      {
        ...task,
        title: assessmentTaskTitle,
        goal: assessmentRecommendation,
        teacherNote: assessmentTeacherNote,
      },
      {
        title: assessmentTaskTitle,
        goal: assessmentRecommendation,
        teacherNote: assessmentTeacherNote,
        exerciseSet: assessmentExerciseSet,
      },
    ));
  }

  function addAssessmentStep() {
    setAssessmentExerciseSet((current) => [...current, customTeacherStep(current.length)]);
  }

  function deleteAssessmentStep(stepId: string) {
    setAssessmentExerciseSet((current) => current.length <= 1 ? current : current.filter((step) => step.id !== stepId));
  }

  function updateAssessmentStep(stepId: string, update: (step: StudentTaskStep) => StudentTaskStep) {
    setAssessmentExerciseSet((current) => current.map((step) => step.id === stepId ? update(step) : step));
  }

  if (!profile) {
    return (
      <section className={cn(panelClass, "grid gap-2.5")}>
        <span className={modelKickerClass}>Entry Assessment Practice Pack Template</span>
        <strong>No editable entry assessment profile yet</strong>
        <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">After the learner completes the entry assessment, the system creates a profile for the teacher to edit into a practice pack.</p>
        <button className={secondaryTeacherButtonClass} type="button" onClick={onBack}>
          Back to Task Center
        </button>
      </section>
    );
  }

  return (
    <section className="grid gap-3.5" aria-labelledby="assessment-editor-title">
      <button className={`${secondaryTeacherButtonClass} w-auto min-w-[132px] justify-self-start`} type="button" onClick={onBack}>
        Back to Task Center
      </button>

      <section className={cn(panelClass, "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3")}>
        <div>
          <span className={modelKickerClass}>Entry Assessment Practice Pack Template</span>
          <h2 className="mt-1 mb-0 text-[22px] text-[var(--ink)]" id="assessment-editor-title">{profile.studentName}'s Initial Practice Pack</h2>
          <p className="m-0 leading-[1.55] text-[var(--muted)]">AI has generated a draft. Edit it for the learner, then submit it to the learner.</p>
        </div>
        <span className={teacherReviewScoreClass}>{profile.overallScore}</span>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>1</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Confirm Practice Target</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">Adjust the AI suggestion into the real practice focus for this learner.</p>
          </div>
        </div>
        <div className={teacherTagListClass}>
          {profile.issueTags.map((tag) => (
            <span className={teacherTagClass} key={tag}>{tag}</span>
          ))}
        </div>
        <label className={templateFieldClass}>
          <span>Assessment summary for the teacher</span>
          <textarea className={`${templateInputClass} resize-y`} rows={3} value={profileSummary} onChange={(event) => setProfileSummary(event.target.value)} />
        </label>
        <label className={templateFieldClass}>
          <span>Practice target shown on the learner task page</span>
          <textarea className={`${templateInputClass} resize-y`} rows={4} value={assessmentRecommendation} onChange={(event) => setAssessmentRecommendation(event.target.value)} />
        </label>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>2</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Edit Tasks Published to the Learner</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">Adjust the task steps the learner needs to complete.</p>
          </div>
        </div>
        <label className={templateFieldClass}>
          <span>Task Title</span>
          <input className={templateInputClass} value={assessmentTaskTitle} onChange={(event) => setAssessmentTaskTitle(event.target.value)} />
        </label>
        <div className="grid gap-3">
          {assessmentExerciseSet.map((exercise, index) => (
            <TeacherStepEditor
              exercise={exercise}
              index={index}
              canDelete={assessmentExerciseSet.length > 1}
              onDelete={() => deleteAssessmentStep(exercise.id)}
              onSourceMode={(mode) => updateAssessmentStep(exercise.id, (step) => ({ ...step, sourceMode: mode }))}
              onBankPackage={(packageId) => updateAssessmentStep(exercise.id, (step) => stepFromQuestionBank(step, packageId))}
              onChange={(update) => updateAssessmentStep(exercise.id, (step) => ({ ...step, ...update }))}
              key={exercise.id}
            />
          ))}
        </div>
        <button className="grid size-[52px] justify-self-end place-items-center rounded-full bg-[var(--green)] text-[28px] font-black text-white shadow-[0_12px_28px_rgba(32,154,120,0.28)]" type="button" onClick={addAssessmentStep}>+</button>
      </section>

      <section className={assessmentSectionClass}>
        <div className={assessmentStepClass}>
          <span className={assessmentStepNumberClass}>3</span>
          <div>
            <strong className="m-0 text-lg text-[var(--ink)]">Instructions for the Learner</strong>
            <p className="mt-1 mb-0 leading-[1.55] text-[var(--muted)]">This text appears on the learner task page. Keep it short, specific, and encouraging.</p>
          </div>
        </div>
        <label className={templateFieldClass}>
          <span>Learner-facing instructions</span>
          <textarea
            className={`${templateInputClass} resize-y`}
            rows={4}
            value={assessmentTeacherNote}
            onChange={(event) => setAssessmentTeacherNote(event.target.value)}
          />
        </label>
        <button className={primaryTeacherButtonClass} type="button" onClick={publishAssessmentTask}>
          Submit to Learner
        </button>
      </section>
    </section>
  );
}

function TeacherStepEditor({
  exercise,
  index,
  canDelete,
  onDelete,
  onSourceMode,
  onBankPackage,
  onChange,
}: {
  exercise: StudentTaskStep;
  index: number;
  canDelete: boolean;
  onDelete: () => void;
  onSourceMode: (mode: "bank" | "custom") => void;
  onBankPackage: (packageId: string) => void;
  onChange: (update: Partial<StudentTaskStep>) => void;
}) {
  const mode = exercise.sourceMode === "custom" ? "custom" : "bank";
  const selectedBank = questionBankPackages.find((pack) => pack.id === exercise.bankPackageId) || questionBankPackages[0];
  const practiceItems = exercise.practiceItems.length ? exercise.practiceItems : selectedBank.items;

  return (
    <article className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[#fffdfa] p-[13px]" data-step-mode={mode}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-[34px] place-items-center rounded-full bg-[var(--navy)] font-black text-white">{index + 1}</span>
          <strong className="text-[var(--ink)]">Task Step {index + 1}</strong>
        </div>
        <div className="inline-grid grid-cols-2 gap-1 rounded-full bg-[#f4f1eb] p-1" role="group" aria-label="Task content source">
          <button className={`rounded-full px-[9px] py-[7px] text-[11px] font-black ${mode === "bank" ? "bg-[var(--green)] text-white" : "bg-transparent text-[var(--muted)]"}`} type="button" onClick={() => onSourceMode("bank")}>Use Question Bank</button>
          <button className={`rounded-full px-[9px] py-[7px] text-[11px] font-black ${mode === "custom" ? "bg-[var(--green)] text-white" : "bg-transparent text-[var(--muted)]"}`} type="button" onClick={() => onSourceMode("custom")}>Custom</button>
        </div>
        <button className="rounded-full bg-[#fff0eb] px-2.5 py-[7px] text-[11px] font-black text-[#cf4b31] disabled:opacity-50" type="button" aria-label={`Delete Task Step ${index + 1}`} onClick={onDelete} disabled={!canDelete}>
          Delete
        </button>
      </div>
      <section className="grid gap-2.5 rounded-[14px] border border-[rgba(32,154,120,0.2)] bg-[var(--green-soft)] p-[11px] hidden:hidden" hidden={mode !== "bank"}>
        <label className={templateFieldClass}>
          <span>Choose Item Pack</span>
          <select className={templateInputClass} value={selectedBank.id} onChange={(event) => onBankPackage(event.target.value)}>
            {questionBankPackages.map((pack) => (
              <option value={pack.id} key={pack.id}>{pack.title}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-1.5">
          <strong className="m-0">{selectedBank.title}</strong>
          <p className="m-0 text-xs leading-[1.55] text-[var(--muted)]">{selectedBank.description}</p>
          <span className={practiceItemListClass}>
            {selectedBank.items.map((item) => (
              <span className={practiceItemPillClass} key={item}>{item}</span>
            ))}
          </span>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-2.5">
        <label className={templateFieldClass}>
          <span>Step Type</span>
          <input className={templateInputClass} value={exercise.type || "Practice"} onChange={(event) => onChange({ type: event.target.value })} />
        </label>
        <label className={templateFieldClass}>
          <span>Practice Count</span>
          <input className={templateInputClass} type="number" min="1" value={exercise.requiredCount || 1} onChange={(event) => onChange({ requiredCount: countFromEditor(event.target.value) })} />
        </label>
      </div>
      <label className={templateFieldClass}>
        <span>Step name shown to the learner</span>
        <input className={templateInputClass} value={exercise.title} onChange={(event) => onChange({ title: event.target.value })} />
      </label>
      <label className={templateFieldClass}>
        <span>Practice items shown to the learner</span>
        <textarea
          className={`${templateInputClass} resize-y`}
          rows={3}
          value={practiceItems.join("\n")}
          onChange={(event) => {
            const nextItems = practiceItemsFromEditor(event.target.value);
            onChange({
              practiceItems: nextItems,
              targetText: nextItems[0] || exercise.targetText,
            });
          }}
        />
      </label>
      <label className={templateFieldClass}>
        <span>Step Instruction</span>
        <textarea className={`${templateInputClass} resize-y`} rows={2} value={exercise.instruction} onChange={(event) => onChange({ instruction: event.target.value })} />
      </label>
      <label className="flex items-start gap-[9px] text-xs font-extrabold leading-normal text-[var(--ink)]">
        <input className="mt-[3px]" type="checkbox" checked={exercise.requiresSubmission} onChange={(event) => onChange({ requiresSubmission: event.target.checked })} />
        <span>This step requires recording and will be submitted to the teacher</span>
      </label>
    </article>
  );
}

function TeacherReviewEditorScreen({
  submission,
  onBack,
  onSaveReview,
}: {
  submission?: TaskSubmission;
  onBack: () => void;
  onSaveReview: (submissionId: string, teacherScore: number, feedback: string) => void;
}) {
  const [teacherScore, setTeacherScore] = React.useState(submission?.teacherScore ?? submission?.aiScores.overall ?? 0);
  const [feedback, setFeedback] = React.useState(submission?.teacherFeedback || "This is closer to the target than last time. Keep slowing down the focus sound. Your teacher can see your progress.");

  if (!submission) {
    return (
      <section className={screenClass} data-screen="teacher">
        <TeacherHeader title="Review Center" subtitle="Edit Feedback" />
        <div className={cn(contentBaseClass, "gap-4")}>
          <section className={cn(panelClass, "grid gap-2.5")}>
            <span className={modelKickerClass}>Review Center</span>
            <strong>Recording Not Found</strong>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">This recording may already be reviewed or may no longer be in the feedback queue.</p>
            <button className={secondaryTeacherButtonClass} type="button" onClick={onBack}>
              Back to Review Center
            </button>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className={screenClass} data-screen="teacher">
      <TeacherHeader title="Review Center" subtitle="Edit Feedback" />
      <div className={cn(contentBaseClass, "gap-4")}>
        <section className={cn(panelClass, "grid gap-2.5")} aria-labelledby="teacher-review-editor-title">
          <button className={`${secondaryTeacherButtonClass} w-auto min-w-[132px] justify-self-start`} type="button" onClick={onBack}>
            Back to Review Center
          </button>
          <div className={teacherReviewHeadingClass}>
            <div>
              <span className={modelKickerClass}>Edit Feedback</span>
              <strong className="block text-[var(--ink)]" id="teacher-review-editor-title">{submission.studentName}</strong>
              <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">{submission.taskTitle}</p>
            </div>
            <span className={teacherReviewScoreClass}>{submission.aiScores.overall}</span>
          </div>
          <div className="grid gap-1.5 rounded-xl border border-[rgba(53,84,110,0.1)] bg-white p-[9px]">
            <p className="m-0 text-xs text-[var(--muted)]">This submission has no linked recording yet. Ask the learner to record again and submit.</p>
          </div>
          <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">{submission.aiSummary || "AI first-pass review is complete and waiting for teacher feedback."}</p>
          <div className={teacherTaskMetaClass}>
            <span className={teacherTaskMetaItemClass}>Item: {submission.exerciseTitle || "Short-Sentence Recording Submit"}</span>
            <span className={teacherTaskMetaItemClass}>Target: {submission.targetText}</span>
            <span className={teacherTaskMetaItemClass}>Heard: {submission.heardText || "To Confirm"}</span>
            <span className={teacherTaskMetaItemClass}>{submission.status}</span>
          </div>
          <div className={teacherScoreStripClass} aria-label="AI First-Pass Scores">
            <span className={teacherScorePillClass}>Tone {submission.aiScores.tone}</span>
            <span className={teacherScorePillClass}>Clarity {submission.aiScores.clarity}</span>
            <span className={teacherScorePillClass}>Rhythm {submission.aiScores.rhythm}</span>
          </div>
          <div className="grid gap-[9px] pt-0.5">
            <label className="grid gap-[5px] text-[11px] font-extrabold text-[var(--muted)]">
              <span>Teacher Score</span>
              <input className="w-full min-w-0 rounded-[11px] border border-[rgba(53,84,110,0.18)] bg-white px-[11px] py-2.5 text-[var(--ink)]" type="number" min="0" max="100" value={teacherScore} onChange={(event) => setTeacherScore(Number(event.target.value || 0))} />
            </label>
            <label className="grid gap-[5px] text-[11px] font-extrabold text-[var(--muted)]">
              <span>Feedback for Learner</span>
              <textarea className="w-full min-w-0 resize-y rounded-[11px] border border-[rgba(53,84,110,0.18)] bg-white px-[11px] py-2.5 leading-normal text-[var(--ink)]" rows={4} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
            </label>
            <button className={primaryTeacherButtonClass} type="button" onClick={() => onSaveReview(submission.id, teacherScore, feedback)}>
              Save Review and Feedback
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

// Chat screen reuses the same static threads for learner and teacher modes.
function ChatScreen({
  teacher,
  threads: allThreads,
  onThreadsChange,
  avatarDataUrl,
}: {
  teacher: boolean;
  threads: ChatThread[];
  onThreadsChange: React.Dispatch<React.SetStateAction<ChatThread[]>>;
  avatarDataUrl: string;
}) {
  const role = teacher ? "teacher" : "student";
  const participantId = teacher ? "teacher-main" : "student-chen";
  const threads = allThreads.filter((thread) => thread.memberIds.includes(participantId));
  const directThreads = threads.filter((thread) => thread.type !== "class");
  const classThreads = threads.filter((thread) => thread.type === "class");
  const [chatMode, setChatMode] = React.useState<"list" | "thread">("list");
  const [selectedThreadId, setSelectedThreadId] = React.useState(directThreads[0]?.id || threads[0]?.id || "");
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) || threads[0] || null;

  function openThread(threadId: string) {
    setSelectedThreadId(threadId);
    setChatMode("thread");
    onThreadsChange((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              messages: thread.messages.map((message) =>
                message.senderId === participantId || message.readBy.includes(participantId)
                  ? message
                  : { ...message, readBy: [...message.readBy, participantId] },
              ),
            }
          : thread,
      ),
    );
  }

  function sendMessage(body: string) {
    const text = body.trim();
    if (!text || !selectedThread) return;
    const sender = role === "teacher" ? "Ms. Wang" : "Chen Xiaohe";
    const message = {
      id: `chat-${selectedThread.id}-${Date.now()}`,
      sender,
      senderId: participantId,
      body: text,
      time: statusTime(),
      readBy: [participantId],
    };
    onThreadsChange((current) =>
      current.map((thread) =>
        thread.id === selectedThread.id
          ? {
              ...thread,
              lastMessage: text,
              messages: [...thread.messages, message].slice(-120),
            }
          : thread,
      ),
    );
    setSelectedThreadId(selectedThread.id);
    setChatMode("thread");
  }

  function deleteThread(threadId: string) {
    const thread = allThreads.find((item) => item.id === threadId);
    if (!thread) return;
    const confirmed = window.confirm(`Delete "${thread.title}" ${thread.type === "class" ? "Group" : "Conversation"}? Chat history will be removed from the local demo data.`);
    if (!confirmed) return;
    onThreadsChange((current) => current.filter((item) => item.id !== threadId));
    if (selectedThreadId === threadId) {
      const nextThread = threads.find((item) => item.id !== threadId);
      setSelectedThreadId(nextThread?.id || "");
      setChatMode("list");
    }
  }

  function createClassChat(title: string, memberIds: string[]) {
    if (!memberIds.length) return;
    const id = `chat-class-${Date.now()}`;
    const thread: ChatThread = {
      id,
      title: title.trim() || "New Class Group Chat",
      type: "class",
      unread: 0,
      lastMessage: "Class group created.",
      memberIds: ["teacher-main", ...memberIds],
      messages: [],
    };
    onThreadsChange((current) => [...current, thread]);
    setSelectedThreadId(id);
    setChatMode("thread");
  }

  function createDirectChat(studentId: string) {
    const student = teacherStudents.find((item) => item.id === studentId) || teacherStudents[0];
    if (!student) return;
    const existing = allThreads.find((thread) => thread.type === "direct" && thread.memberIds.includes(student.id));
    if (existing) {
      openThread(existing.id);
      return;
    }
    const id = `chat-direct-${student.id}-${Date.now()}`;
    const thread: ChatThread = {
      id,
      title: student.name,
      type: "direct",
      unread: 0,
      lastMessage: "Learner chat created.",
      memberIds: ["teacher-main", student.id],
      messages: [],
    };
    onThreadsChange((current) => [...current, thread]);
    setSelectedThreadId(id);
    setChatMode("thread");
  }

  function createStudentDirectChat() {
    const existing = allThreads.find((thread) => thread.type === "direct" && thread.memberIds.includes("student-chen"));
    if (existing) {
      openThread(existing.id);
      return;
    }
    const id = `chat-direct-student-chen-${Date.now()}`;
    const thread: ChatThread = {
      id,
      title: "Ms. Wang",
      type: "direct",
      unread: 0,
      lastMessage: "Teacher chat opened.",
      memberIds: ["teacher-main", "student-chen"],
      messages: [
        {
          id: `msg-${id}-hello`,
          sender: "Chen Xiaohe",
          senderId: "student-chen",
          body: "Teacher, I want to ask about today's pronunciation practice.",
          time: statusTime(),
          readBy: ["student-chen"],
        },
      ],
    };
    onThreadsChange((current) => [...current, thread]);
    setSelectedThreadId(id);
    setChatMode("thread");
  }

  return (
    <section className={screenClass} data-screen="chat">
      {teacher ? <TeacherHeader title="Teacher Chat" subtitle="Messages" className="min-h-[146px]" /> : <BrandHeader streak={1} />}
      <div className={cn(contentClass, "px-3.5")}>
        {chatMode === "thread" && selectedThread ? (
          <ChatThreadWindow
            thread={selectedThread}
            participantId={participantId}
            role={role}
            onBack={() => setChatMode("list")}
            onSendMessage={sendMessage}
            onDeleteThread={deleteThread}
            avatarDataUrl={avatarDataUrl}
          />
        ) : (
          <section className="grid gap-3.5 overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-3.5">
            <ChatThreadGroup title="Teacher Chat" threads={directThreads} participantId={participantId} role={role} onOpenThread={openThread} onDeleteThread={deleteThread} />
            <ChatThreadGroup title="Class Group" threads={classThreads} participantId={participantId} role={role} onOpenThread={openThread} onDeleteThread={deleteThread} />
            {!threads.length ? <p className="m-0 py-3 text-center text-xs font-bold leading-[1.6] text-[var(--muted)]">No conversations yet.</p> : null}
            {teacher ? <TeacherChatTools onCreateClassChat={createClassChat} onCreateDirectChat={createDirectChat} /> : <StudentChatTools onCreateStudentDirectChat={createStudentDirectChat} />}
          </section>
        )}
      </div>
    </section>
  );
}

function ChatThreadGroup({
  title,
  threads,
  participantId,
  role,
  onOpenThread,
  onDeleteThread,
}: {
  title: string;
  threads: ChatThread[];
  participantId: string;
  role: "student" | "teacher";
  onOpenThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
}) {
  if (!threads.length) return null;
  return (
    <div className="grid gap-[7px]">
      <p className={sectionLabelClass}>{title}</p>
      <div className="grid overflow-hidden rounded-[14px] border border-[rgba(53,84,110,0.11)] bg-white">
        {threads.map((thread) => {
          const displayTitle = chatThreadDisplayTitle(thread, role);
          const lastMessage = thread.messages.at(-1);
          return (
            <div className="group relative grid overflow-x-auto overflow-y-hidden bg-white [scrollbar-width:none] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden [&+&]:border-t [&+&]:border-[rgba(53,84,110,0.1)]" key={thread.id}>
              <div className="absolute inset-y-0 right-0 grid w-[148px] grid-cols-[74px_74px] items-stretch justify-end bg-white" aria-label={`${displayTitle} conversation actions`}>
                <button className="min-h-[76px] min-w-[74px] rounded-none border-l border-[rgba(53,84,110,0.08)] bg-[var(--red)] text-xs font-black text-white active:bg-[#a83b25]" type="button" onClick={() => onDeleteThread(thread.id)}>Delete</button>
              </div>
              <button className="relative z-[1] grid min-h-[76px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none bg-white px-3.5 py-[13px] text-left text-[var(--ink)] [scroll-snap-align:start] transition-transform duration-200 group-hover:-translate-x-[148px] group-focus-within:-translate-x-[148px]" type="button" onClick={() => onOpenThread(thread.id)}>
                <Avatar name={displayTitle} className="grid size-[38px] place-items-center rounded-full bg-[var(--green)] text-[15px] font-black text-white object-cover" />
                <span className="grid min-w-0 gap-1">
                  <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px]">{displayTitle}</strong>
                  <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[var(--muted)]">{lastMessage?.body || threadTypeLabel(thread)}</small>
                </span>
                <span className="grid min-w-16 justify-items-end gap-1">
                  <time className="text-[11px] text-[var(--muted)]">{lastMessage?.time || ""}</time>
                  <b className="rounded-full bg-[var(--green-soft)] px-[7px] py-1 text-[10px] font-extrabold text-[var(--green)]">{threadTypeLabel(thread)}</b>
                </span>
                {unreadCount(thread, participantId) ? (
                  <em className="absolute top-[11px] left-[50px] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--red)] text-[10px] font-black not-italic text-white">
                    {unreadCount(thread, participantId)}
                  </em>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function chatThreadDisplayTitle(thread: ChatThread, role: "student" | "teacher") {
  if (thread.type === "class") return thread.title || "Class Group";
  if (role === "student") return "Ms. Wang";
  const studentId = thread.memberIds.find((id) => id !== "teacher-main");
  const student = teacherStudents.find((item) => item.id === studentId);
  return student?.name || thread.title || "Student Chat";
}

function ChatThreadWindow({
  thread,
  participantId,
  role,
  onBack,
  onSendMessage,
  onDeleteThread,
  avatarDataUrl,
}: {
  thread: ChatThread;
  participantId: string;
  role: "student" | "teacher";
  onBack: () => void;
  onSendMessage: (body: string) => void;
  onDeleteThread: (threadId: string) => void;
  avatarDataUrl: string;
}) {
  const quickReplies = role === "teacher" ? teacherQuickReplies : studentQuickReplies;
  const displayTitle = chatThreadDisplayTitle(thread, role);
  const unread = unreadCount(thread, participantId);
  const [draft, setDraft] = React.useState("");

  function sendDraft() {
    onSendMessage(draft);
    setDraft("");
  }

  return (
    <section className="grid gap-3 overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-3.5">
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 border-b border-[rgba(53,84,110,0.1)] pb-3">
        <button className="grid size-9 place-items-center rounded-full bg-[#f2eee7] text-[22px] leading-none text-[var(--red)]" type="button" onClick={onBack} aria-label="Back to chat list">
          ‹
        </button>
        <div>
          <strong className="block text-[15px] text-[var(--ink)]">{displayTitle}</strong>
          <span className="text-[11px] text-[var(--muted)]">{threadTypeLabel(thread)} · {unread} Unread</span>
        </div>
        <span className={statusPillClass}>{thread.type === "class" ? "Class" : "Direct"}</span>
      </header>

      <div className="rounded-[14px] bg-[#f8f5ef] p-3">
        <span className={modelKickerClass}>Communication Focus</span>
        <p className="mt-1 mb-0 text-xs leading-[1.6] text-[var(--muted)]">
          {thread.type === "class"
            ? "Use class notices for shared plans. Use teacher chat for personal pronunciation questions."
            : "Use this thread to send practice updates, ask for recording review, or confirm the next practice focus."}
        </p>
      </div>

      {thread.type === "class" ? (
        <div className="flex justify-end">
          <button className="rounded-full bg-[var(--red-soft)] px-3 py-2 text-[11px] font-black text-[var(--red)]" type="button" onClick={() => onDeleteThread(thread.id)}>Delete Group</button>
        </div>
      ) : null}

      <div className="grid max-h-[390px] gap-3 overflow-y-auto pr-1">
        {thread.messages.map((message) => {
          const mine = message.senderId === participantId;
          const readCount = message.readBy.length;
          return (
            <article className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-2 ${mine ? "justify-items-end" : ""}`} key={message.id}>
              {!mine ? <Avatar name={message.sender} className="grid size-7 place-items-center rounded-full bg-[var(--green)] text-[11px] font-black text-white" /> : <span />}
              <div className={`max-w-[230px] rounded-2xl px-3 py-2.5 ${mine ? "bg-[var(--green)] text-white" : "bg-white text-[var(--ink)]"}`}>
                <span className={`mb-1 block text-[10px] font-black ${mine ? "text-white/75" : "text-[var(--muted)]"}`}>{message.sender}</span>
                <p className="m-0 text-xs leading-[1.55]">{message.body}</p>
                <small className={`mt-1 block text-[10px] ${mine ? "text-white/70" : "text-[var(--muted)]"}`}>
                  {message.time} · {mine ? (readCount > 1 ? "Read" : "Unread") : "Read"}
                </small>
              </div>
              {mine ? <Avatar name={message.sender} src={avatarDataUrl} className="grid size-7 place-items-center rounded-full bg-[var(--navy)] text-[11px] font-black text-white object-cover" /> : <span />}
            </article>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="Quick replies">
        {quickReplies.map((reply) => (
          <button className="rounded-full bg-[#f2eee7] px-2.5 py-1.5 text-[11px] font-black text-[var(--navy)]" type="button" key={reply} onClick={() => onSendMessage(reply)}>{reply}</button>
        ))}
      </div>
      <form className="grid grid-cols-[1fr_auto] gap-2" onSubmit={(event) => {
        event.preventDefault();
        sendDraft();
      }}>
        <input
          className="min-h-11 rounded-xl border border-[var(--line)] bg-[#fbfaf7] px-3 text-xs font-extrabold text-[var(--ink)]"
          placeholder={role === "teacher" ? "Type encouragement, reminders, or practice advice" : "Type a practice update or question"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="rounded-xl bg-[var(--green)] px-3 text-xs font-black text-white" type="submit">Send</button>
      </form>
    </section>
  );
}

function TeacherChatTools({
  onCreateClassChat,
  onCreateDirectChat,
}: {
  onCreateClassChat: (title: string, memberIds: string[]) => void;
  onCreateDirectChat: (studentId: string) => void;
}) {
  const [classTitle, setClassTitle] = React.useState("Qiyin Class 1 Group");
  const [selectedStudentIds, setSelectedStudentIds] = React.useState(teacherStudents.map((student) => student.id));
  const [directStudentId, setDirectStudentId] = React.useState(teacherStudents[0]?.id || "");

  function toggleClassStudent(studentId: string, checked: boolean) {
    setSelectedStudentIds((current) =>
      checked ? [...new Set([...current, studentId])] : current.filter((id) => id !== studentId),
    );
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-[rgba(53,84,110,0.12)] bg-white p-3.5" aria-label="Create Chat">
      <div className="grid gap-2.5">
        <span className={modelKickerClass}>Create Class Group</span>
        <label className="grid gap-1.5 text-xs font-extrabold text-[var(--muted)]">
          <span>Group name</span>
          <input className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[#fbfaf7] px-3 text-[var(--ink)] font-extrabold" value={classTitle} onChange={(event) => setClassTitle(event.target.value)} placeholder="Example: Wednesday Tone Practice" />
        </label>
        <div className="flex flex-wrap gap-2" aria-label="Choose learners for the group">
          {teacherStudents.map((student) => (
            <label className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[rgba(32,154,120,0.18)] bg-[var(--green-soft)] px-2.5 py-[7px] text-[var(--green)]" key={student.id}>
              <input
                className="accent-[var(--green)]"
                type="checkbox"
                checked={selectedStudentIds.includes(student.id)}
                onChange={(event) => toggleClassStudent(student.id, event.target.checked)}
              />
              <span>{student.name}</span>
            </label>
          ))}
        </div>
        <button className={primaryTeacherButtonClass} type="button" onClick={() => onCreateClassChat(classTitle, selectedStudentIds)}>Create Group</button>
      </div>
      <div className="grid gap-2.5 border-t border-[rgba(53,84,110,0.1)] pt-3">
        <span className={modelKickerClass}>Create Learner Chat</span>
        <label className="grid gap-1.5 text-xs font-extrabold text-[var(--muted)]">
          <span>Choose Learner</span>
          <select className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[#fbfaf7] px-3 text-[var(--ink)] font-extrabold" value={directStudentId} onChange={(event) => setDirectStudentId(event.target.value)}>
            {teacherStudents.map((student) => (
              <option value={student.id} key={student.id}>{student.name}</option>
            ))}
          </select>
        </label>
        <button className={secondaryTeacherButtonClass} type="button" onClick={() => onCreateDirectChat(directStudentId)}>Start Chat</button>
      </div>
    </section>
  );
}

function StudentChatTools({ onCreateStudentDirectChat }: { onCreateStudentDirectChat: () => void }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-[rgba(53,84,110,0.12)] bg-white p-3.5" aria-label="Contact Teacher">
      <button className={secondaryTeacherButtonClass} type="button" onClick={onCreateStudentDirectChat}>Chat with Teacher</button>
    </section>
  );
}

// Account screen handles login/register state while preserving the legacy account layout.
function AccountScreen({
  role,
  user,
  attempts,
  publishedTasks,
  chatThreads: accountChatThreads,
  avatarDataUrl,
  localAccount,
  onRoleChange,
  onLogin,
  onLocalLogin,
  onLogout,
  onAvatarChange,
}: {
  role: Exclude<Role, "guest">;
  user: AuthUser | null;
  attempts: PracticeAttempt[];
  publishedTasks: StudentTaskPackage[];
  chatThreads: ChatThread[];
  avatarDataUrl: string;
  localAccount: LocalAccountState;
  onRoleChange: (role: Exclude<Role, "guest">) => void;
  onLogin: (username: string, password: string) => Promise<void> | void;
  onLocalLogin: (role: Exclude<Role, "guest">, username: string, password: string) => void;
  onLogout: () => void;
  onAvatarChange: (avatarDataUrl: string) => void;
}) {
  // Local form state is only for the account controls on this screen.
  const [username, setUsername] = React.useState(user?.username || localAccount.username || "jiawen");
  const [password, setPassword] = React.useState(localAccount.password || "");
  const [busy, setBusy] = React.useState(false);
  const signedIn = Boolean(user || localAccount.isLoggedIn);
  const displayName = user?.name || localAccount.displayName || (role === "teacher" ? "Ms. Wang" : "Chen Xiaohe");
  const participantId = role === "teacher" ? "teacher-main" : "student-chen";
  const unread = accountChatThreads
    .filter((thread) => thread.memberIds.includes(participantId))
    .reduce((sum, thread) => sum + unreadCount(thread, participantId), 0);
  const hasTodayTask = publishedTasks.some((task) => task.status === "Published");
  const accountInputClass = "w-full min-w-0 rounded-xl border border-[rgba(53,84,110,0.18)] bg-white px-3 py-[11px] text-[var(--ink)]";
  const accountFieldClass = "grid gap-[5px] text-[11px] font-extrabold text-[var(--muted)]";
  const accountToggleClass = (selected: boolean) =>
    `grid min-h-[42px] cursor-pointer place-items-center rounded-[11px] text-[13px] font-black ${
      selected ? "bg-[var(--green)] text-white" : "bg-transparent text-[var(--muted)]"
    }`;

  // Submit delegates real auth work to callbacks supplied by the app shell.
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (user) {
        onLocalLogin(role, username, password);
        return;
      }
      try {
        await onLogin(username, password);
      } catch {
        onLocalLogin(role, username, password);
      }
    } finally {
      setBusy(false);
    }
  }

  function updateAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => onAvatarChange(String(reader.result || "")));
    reader.readAsDataURL(file);
  }

  return (
    <section className={screenClass} data-screen="account">
      <header className={appHeaderClass}>
        <div className={statusRowClass}>
          <span>{statusTime()}</span>
          <span>Account</span>
        </div>
        <div className={brandRowClass}>
          <div>
            <h1 className={brandClass}>
              <span className={brandAccentClass}>VoiceSight</span> Account
            </h1>
            <p className="mt-[7px] mb-0 text-xs text-[rgba(255,255,255,0.54)]">Current: {role === "teacher" ? "Teacher" : "Learner"}</p>
          </div>
        </div>
      </header>
      <div className={contentClass}>
        <section className={cn(panelClass, "grid gap-3.5 border-[rgba(32,154,120,0.22)] bg-[linear-gradient(135deg,rgba(32,154,120,0.09),transparent_48%),var(--surface)]")} aria-labelledby="account-profile-title">
          <div className="grid grid-cols-[auto_1fr] items-center gap-3.5">
            <label className="grid cursor-pointer justify-items-center gap-[7px] text-[11px] font-extrabold text-[var(--green)]" aria-label="Change avatar">
              <Avatar name={displayName} src={avatarDataUrl} className="grid size-[58px] place-items-center rounded-full bg-[var(--green)] text-[23px] font-black text-white object-cover" />
              <input className="absolute size-px opacity-0" type="file" accept="image/*" onChange={updateAvatar} />
              <span>Change avatar</span>
            </label>
            <div>
              <span className={modelKickerClass}>{signedIn ? "Signed In" : "Local Demo Account"}</span>
              <h2 className="m-0 text-[23px] text-[var(--ink)]" id="account-profile-title">{displayName}</h2>
              <p className="m-0 text-[13px] leading-[1.7] text-[var(--muted)]">Current: {role === "teacher" ? "Teacher" : "Learner"}. Avatar and chat identity are saved in this browser.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2" aria-label="Account status">
            <div className="grid gap-0.5 rounded-[13px] bg-[rgba(255,255,255,0.72)] px-2 py-2.5 text-center">
              <strong className="text-xl leading-none text-[var(--navy)]">{Math.max(1, attempts.length || 1)}</strong>
              <span className="text-[10px] font-extrabold text-[var(--muted)]">Practice Streak</span>
            </div>
            <div className="grid gap-0.5 rounded-[13px] bg-[rgba(255,255,255,0.72)] px-2 py-2.5 text-center">
              <strong className="text-xl leading-none text-[var(--navy)]">{unread}</strong>
              <span className="text-[10px] font-extrabold text-[var(--muted)]">Unread Messages</span>
            </div>
            <div className="grid gap-0.5 rounded-[13px] bg-[rgba(255,255,255,0.72)] px-2 py-2.5 text-center">
              <strong className="text-xl leading-none text-[var(--navy)]">{hasTodayTask ? "Yes" : "No"}</strong>
              <span className="text-[10px] font-extrabold text-[var(--muted)]">Today Tasks</span>
            </div>
          </div>
        </section>

        <section className={cn(panelClass, "grid gap-3.5")} aria-labelledby="account-login-title">
          <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
            <div>
              <span className={modelKickerClass}>Account Settings</span>
              <h2 className="m-0 text-[23px] text-[var(--ink)]" id="account-login-title">{signedIn ? "Update Login Info" : "Log In to Demo Account"}</h2>
            </div>
            <span className={statusPillClass}>{signedIn ? "Saved" : "Not Signed In"}</span>
          </div>
          <form className="grid gap-2.5" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-[#f4f1eb] p-1" role="radiogroup" aria-label="Choose login role">
              <label className={accountToggleClass(role === "student")}>
                <input
                  className="pointer-events-none absolute opacity-0"
                  type="radio"
                  name="login-role"
                  value="student"
                  checked={role === "student"}
                  onChange={() => onRoleChange("student")}
                />
                <span>Learner</span>
              </label>
              <label className={accountToggleClass(role === "teacher")}>
                <input
                  className="pointer-events-none absolute opacity-0"
                  type="radio"
                  name="login-role"
                  value="teacher"
                  checked={role === "teacher"}
                  onChange={() => onRoleChange("teacher")}
                />
                <span>Teacher</span>
              </label>
            </div>
            <label className={accountFieldClass}>
              <span>Account</span>
              <input className={accountInputClass} value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" placeholder="Enter account" />
            </label>
            <label className={accountFieldClass}>
              <span>Password</span>
              <input
                className={accountInputClass}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={3}
                required={!signedIn}
                autoComplete="current-password"
                placeholder="Enter password"
              />
            </label>
            <button className={primaryTeacherButtonClass} type="submit" disabled={busy}>
              {busy ? "Connecting..." : signedIn ? "Save Account" : "Log In"}
            </button>
            {signedIn && (
              <button className={secondaryTeacherButtonClass} type="button" onClick={onLogout}>
                Log Out
              </button>
            )}
          </form>
        </section>

        <section className="px-1 pt-0.5 pb-1.5 text-[11px] leading-[1.6] text-[var(--muted)]" aria-label="Local data note">
          This is a local demo account and does not connect to a real authentication system. Clearing browser data also removes the avatar, account, and chat history.
        </section>
      </div>
    </section>
  );
}

// Bottom navigation switches between role-specific legacy views.
function AppNav({
  role,
  studentView,
  teacherView,
  onStudentView,
  onTeacherView,
}: {
  role: Role;
  studentView: StudentView;
  teacherView: TeacherView;
  onStudentView: (view: StudentView) => void;
  onTeacherView: (view: TeacherView) => void;
}) {
  // Guests stay on the role picker and do not need tab navigation.
  if (role === "guest") return <nav className="hidden" aria-label="Main pages" hidden />;

  // Teachers use the management tabs from legacy data.
  if (role === "teacher") {
    return (
      <nav
        className="absolute inset-x-0 bottom-0 z-[5] grid grid-cols-6 border-t border-[rgba(207,200,189,0.92)] bg-[rgba(255,254,250,0.94)] px-2.5 pt-[7px] pb-[calc(7px+env(safe-area-inset-bottom))] backdrop-blur-2xl"
        aria-label="Main pages"
      >
        {teacherNavItems.map((item) => (
          <button
            className={`grid min-h-[51px] place-items-center content-center gap-px rounded-xl text-[11px] ${
              item.view === teacherView
                ? "bg-[var(--red-soft)] font-extrabold text-[var(--red)]"
                : "text-[var(--muted)]"
            }`}
            type="button"
            key={item.view}
            data-teacher-view={item.view}
            aria-current={item.view === teacherView ? "page" : "false"}
            onClick={() => onTeacherView(item.view)}
          >
            <span className="text-[9px] tracking-[0.12em]">{item.index}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  // Learners use the practice-focused tabs from legacy data.
  const activeStudentView = ["entryAssessment", "toneDrill", "teachingClip"].includes(studentView)
    ? "practice"
    : studentView;
  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-[5] grid grid-cols-5 border-t border-[rgba(207,200,189,0.92)] bg-[rgba(255,254,250,0.94)] px-2.5 pt-[7px] pb-[calc(7px+env(safe-area-inset-bottom))] backdrop-blur-2xl"
      aria-label="Main pages"
    >
      {studentNavItems.map((item) => (
        <button
          className={`grid min-h-[51px] place-items-center content-center gap-px rounded-xl text-[11px] ${
            item.view === activeStudentView
              ? "bg-[var(--red-soft)] font-extrabold text-[var(--red)]"
              : "text-[var(--muted)]"
          }`}
          type="button"
          key={item.view}
          data-view={item.view}
          aria-current={item.view === activeStudentView ? "page" : "false"}
          onClick={() => onStudentView(item.view)}
        >
          <span className="text-[9px] tracking-[0.12em]">{item.index}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
