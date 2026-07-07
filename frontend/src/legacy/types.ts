import type { ScoreSet, SyllableFeedback } from "../types";

// Role and view names mirror the legacy web navigation state.
export type Role = "guest" | "student" | "teacher";
export type StudentView =
  | "home"
  | "practice"
  | "tasks"
  | "detail"
  | "progress"
  | "chat"
  | "account"
  | "taskDetail"
  | "entryAssessment"
  | "toneDrill"
  | "teachingClip";
export type TeacherView =
  | "home"
  | "students"
  | "tasks"
  | "assessmentEditor"
  | "taskPackageEditor"
  | "reviews"
  | "reviewEditor"
  | "chat"
  | "account";

// The legacy UI needs extra cue fields beyond the backend analysis shape.
export interface LegacySyllable extends SyllableFeedback {
  tone: string;
  status: string;
  level: "good" | "warn" | "focus";
  mouthCue: string;
  tongueCue: string;
  toneCue: string;
  targetTone: number[];
  currentTone: number[];
}

// Teacher dashboard cards use this local sample profile shape.
export interface TeacherStudent {
  id: string;
  name: string;
  stage: string;
  latestScore: number;
  weeklyPracticeCount: number;
  pendingSubmissions: number;
  overdueTasks?: number;
  lastPracticeAt: string;
  focusTags: string[];
  assessmentSummary: string;
  trend?: string;
}

// Chat data is normalized into this UI shape after loading from the backend.
export interface ChatThread {
  id: string;
  title: string;
  type: "direct" | "class";
  unread: number;
  lastMessage: string;
  memberIds: string[];
  messages: {
    id: string;
    sender: string;
    senderId: string;
    body: string;
    time: string;
    readBy: string[];
    relatedText?: string;
  }[];
}

// Teacher-assigned practice packs use the same shape as the legacy task UI.
export interface StudentTaskStep {
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
}

export interface StudentTaskPackage {
  id: string;
  title: string;
  goal: string;
  status: string;
  suggestedDue: string;
  requiredSubmissions: number;
  practiceText: string;
  exerciseSet: StudentTaskStep[];
  targetStudentId?: string;
  focusTag?: string;
  teacherNote?: string;
  reviewTags?: string[];
}

export interface TaskSubmission {
  // Local submissions power the review UI before full backend review sync.
  id: string;
  taskId: string;
  studentId: string;
  studentName: string;
  taskTitle: string;
  exerciseTitle: string;
  targetText: string;
  heardText: string;
  status: "Needs Teacher Feedback" | "Teacher Reviewed";
  aiScores: ScoreSet;
  aiSummary: string;
  submittedAt?: string;
  reviewedAt?: string;
  recordingUrl?: string;
  teacherScore?: number;
  teacherFeedback?: string;
}

export interface ToneDrill {
  tone: string;
  label: string;
  description: string;
  words: string[];
}

export interface EntryAssessmentItem {
  id: string;
  type: string;
  title: string;
  prompt: string;
  pinyin: string;
  focus: string;
}

export interface EntryAssessmentResult extends EntryAssessmentItem {
  score: number;
  note: string;
}

export interface EntryAssessmentSession {
  active: boolean;
  currentIndex: number;
  results: EntryAssessmentResult[];
  completed: boolean;
}

export interface QuestionBankPackage {
  id: string;
  title: string;
  category: string;
  focusTags: string[];
  description: string;
  items: string[];
  targetText: string;
}

export interface AssessmentProfile {
  // Assessment profiles are teacher-editable summaries from the entry flow.
  id: string;
  studentId?: string;
  studentName: string;
  status: string;
  overallScore: number;
  issueTags: string[];
  issueCategories?: string[];
  profileSummary: string;
  recommendation: string;
  completedAt?: string;
  itemResults?: EntryAssessmentResult[];
}
