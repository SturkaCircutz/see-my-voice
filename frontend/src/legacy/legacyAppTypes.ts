import type { PinyinDiagnosisIssue, ScoreSet } from "../types";
import type {
  AssessmentProfile,
  ChatThread,
  EntryAssessmentResult,
  EntryAssessmentSession,
  LegacySyllable,
  Role,
  StudentTaskPackage,
  StudentTaskStep,
  StudentView,
  TaskSubmission,
  TeacherStudent,
  TeacherView,
} from "./data";

export interface TeachingClipSegment {
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

export interface TeachingClipPlan {
  title: string;
  targetText: string;
  focusIssue?: PinyinDiagnosisIssue;
  targetSyllable: LegacySyllable;
  segments: TeachingClipSegment[];
}

export interface TaskStepProgress {
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

export type TaskProgressState = Record<string, Record<string, TaskStepProgress>>;

export interface LocalAccountState {
  isLoggedIn: boolean;
  isRegistered?: boolean;
  username: string;
  displayName: string;
  password: string;
  avatarDataUrl?: string;
  lastLoginAt?: string;
  registeredAt?: string;
  entryAssessmentCompleted?: boolean;
}

export type TeacherStudentFilter = "all" | "attention";
export type RecordingContext = "practice" | "entryAssessment" | "task";

// This is the browser-saved legacy UI state, not the backend database schema.
export interface StoredLegacyState {
  role?: Role;
  currentRole?: Role;
  studentView?: StudentView;
  currentView?: StudentView | "teacher" | "home";
  teacherView?: TeacherView;
  teacherStudentFilter?: TeacherStudentFilter;
  targetText?: string;
  assessmentSession?: EntryAssessmentSession;
  assessmentProfiles?: AssessmentProfile[];
  selectedSyllableId?: string;
  selectedStudentId?: string;
  teacherStudents?: TeacherStudent[];
  selectedToneDrill?: string;
  practiceBackView?: "" | "toneDrill";
  publishedTasks?: StudentTaskPackage[];
  taskSubmissions?: TaskSubmission[];
  taskStepProgress?: TaskProgressState;
  selectedTaskId?: string;
  activeTaskExerciseId?: string;
  activeTaskItemIndex?: number;
  selectedReviewId?: string;
  account?: LocalAccountState;
  chatThreads?: ChatThread[];
}
