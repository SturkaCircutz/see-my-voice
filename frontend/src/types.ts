export type AuthMode = "login" | "register";

// Public user data mirrors the backend auth response.
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: "student" | "teacher";
  createdAt: string;
  lastLoginAt?: string;
  loginCount: number;
}

export interface AuthResponse {
  // Login and registration both return a token plus user profile.
  token: string;
  user: AuthUser;
}

export interface ChatApiThread {
  // Chat thread fields are serialized from Mongo ids to strings.
  id: string;
  memberIds: string[];
  type: "direct" | "class";
  title: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatApiMessage {
  id: string;
  threadId: string;
  senderId: string;
  sender: string;
  body: string;
  createdAt: string;
}

export interface TaskApiStep {
  // Each practice pack step can come from the question bank or custom text.
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

export interface TaskApiItem {
  id: string;
  teacherId: string;
  studentId: string;
  title: string;
  goal: string;
  targetText: string;
  suggestedDue: string;
  requiredSubmissions: number;
  practiceText: string;
  focusTag?: string;
  teacherNote?: string;
  reviewTags: string[];
  exerciseSet: TaskApiStep[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreSet {
  overall: number;
  tone: number;
  clarity: number;
  rhythm: number;
}

export interface SyllableFeedback {
  id: string;
  character: string;
  pinyin: string;
  score: number;
  focus: string;
  feedback: string;
}

export interface PinyinDiagnosisIssue {
  index?: number;
  type?: string;
  title?: string;
  summary?: string;
  focus?: string;
  detail?: string;
  practice?: string[];
}

export interface PinyinDiagnosis {
  targetText?: string;
  heardText?: string;
  targetPinyin?: string[];
  heardPinyin?: string[];
  issues: PinyinDiagnosisIssue[];
  summary: string;
}

export interface PronunciationAnalysis {
  // The UI uses this normalized result regardless of the analysis backend.
  heardText: string;
  summary: string;
  scores: ScoreSet;
  syllables: SyllableFeedback[];
  pinyinDiagnosis?: PinyinDiagnosis | null;
  raw?: unknown;
}

export interface PracticeAttempt {
  // Attempts track one recording workflow for one target sentence.
  id: string;
  targetText: string;
  text?: string;
  status: "created" | "analyzing" | "complete" | "failed";
  createdAt: string;
  updatedAt?: string;
  scores?: ScoreSet;
  analysis?: PronunciationAnalysis;
  error?: string;
}
