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
}

export interface PracticeAttempt {
  id: string;
  text: string;
  createdAt: string;
  scores: ScoreSet;
}
