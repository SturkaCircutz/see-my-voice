export type AuthMode = "login" | "register";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  createdAt: string;
  lastLoginAt?: string;
  loginCount: number;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
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

export interface PronunciationAnalysis {
  heardText: string;
  summary: string;
  scores: ScoreSet;
  syllables: SyllableFeedback[];
  raw?: unknown;
}

export interface PracticeAttempt {
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
