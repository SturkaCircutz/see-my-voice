import type { AuthResponse, AuthUser, ChatApiMessage, ChatApiThread, PracticeAttempt, PronunciationAnalysis, TaskApiItem } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // All API helpers pass through one fetch wrapper.
  const headers = new Headers(options.headers);

  // Centralize browser-to-Express auth and JSON handling so page components stay transport-agnostic.
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload as T;
}

export function registerUser(input: {
  name: string;
  username: string;
  password: string;
  role: "student" | "teacher";
}): Promise<AuthResponse> {
  // Register and authenticate in one request.
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginUser(input: {
  username: string;
  password: string;
  role: "student" | "teacher";
}): Promise<AuthResponse> {
  // Login returns the same payload shape as registration.
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logoutUser(): Promise<{ ok: true }> {
  return request<{ ok: true }>("/api/auth/logout", {
    method: "POST",
  });
}

export function fetchCurrentUser(): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>("/api/auth/me");
}

export function fetchUsers(role?: "student" | "teacher"): Promise<{ users: AuthUser[] }> {
  // Teachers use role-filtered users for task and chat pickers.
  return request<{ users: AuthUser[] }>(`/api/users${role ? `?role=${role}` : ""}`);
}

export function fetchChatThreads(): Promise<{ threads: ChatApiThread[] }> {
  return request<{ threads: ChatApiThread[] }>("/api/chat/threads");
}

export function createChatThread(input: {
  title: string;
  type?: "direct" | "class";
  memberIds: string[];
}): Promise<{ thread: ChatApiThread }> {
  // Thread creation is shared by direct chats and class chats.
  return request<{ thread: ChatApiThread }>("/api/chat/threads", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchChatMessages(threadId: string): Promise<{ messages: ChatApiMessage[] }> {
  return request<{ messages: ChatApiMessage[] }>(`/api/chat/threads/${threadId}/messages`);
}

export function createChatMessage(threadId: string, body: string): Promise<{ message: ChatApiMessage }> {
  return request<{ message: ChatApiMessage }>(`/api/chat/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function fetchTasks(): Promise<{ tasks: TaskApiItem[] }> {
  return request<{ tasks: TaskApiItem[] }>("/api/tasks");
}

export function createTask(input: Omit<TaskApiItem, "id" | "teacherId" | "createdAt" | "updatedAt" | "status"> & {
  studentId: string;
}): Promise<{ task: TaskApiItem }> {
  // The backend fills ownership, dates, and published status.
  return request<{ task: TaskApiItem }>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchPracticeAttempts(): Promise<{ attempts: PracticeAttempt[] }> {
  return request<{ attempts: PracticeAttempt[] }>("/api/attempts");
}

export function createPracticeAttempt(targetText: string): Promise<{ attempt: PracticeAttempt }> {
  // Create an attempt before uploading audio for analysis.
  return request<{ attempt: PracticeAttempt }>("/api/attempts", {
    method: "POST",
    body: JSON.stringify({ targetText }),
  });
}

export function analyzePracticeAttempt(
  attemptId: string,
  audio: Blob,
): Promise<{ attempt: PracticeAttempt; analysis: PronunciationAnalysis }> {
  // Attempt analysis uploads only audio because target text is already stored.
  const form = new FormData();
  form.append("audio", audio, "practice.webm");

  return request<{ attempt: PracticeAttempt; analysis: PronunciationAnalysis }>(
    `/api/attempts/${attemptId}/analyze`,
    {
      method: "POST",
      body: form,
    },
  );
}

export function analyzePronunciation(
  text: string,
  audio: Blob,
): Promise<PronunciationAnalysis> {
  // Standalone pronunciation analysis still sends both text and audio.
  const form = new FormData();
  form.append("text", text);
  form.append("audio", audio, "practice.webm");

  return request<PronunciationAnalysis>("/api/pronunciation/analyze", {
    method: "POST",
    body: form,
  });
}
