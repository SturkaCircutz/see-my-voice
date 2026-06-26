import type { AuthResponse, AuthUser, PronunciationAnalysis } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const TOKEN_KEY = "see-my-voice-token";

export function getToken(): string {
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
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
}): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginUser(input: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchCurrentUser(): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>("/api/auth/me");
}

export function fetchUsers(): Promise<{ users: AuthUser[] }> {
  return request<{ users: AuthUser[] }>("/api/users");
}

export function analyzePronunciation(
  text: string,
  audio: Blob,
): Promise<PronunciationAnalysis> {
  const form = new FormData();
  form.append("text", text);
  form.append("audio", audio, "practice.webm");

  return request<PronunciationAnalysis>("/api/pronunciation/analyze", {
    method: "POST",
    body: form,
  });
}
