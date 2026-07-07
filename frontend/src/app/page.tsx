"use client";

import React from "react";
import {
  clearToken,
  fetchPracticeAttempts,
  loginUser,
  registerUser,
  setToken,
} from "../api";
import { LegacyApp } from "../LegacyApp";
import type { AuthUser, PracticeAttempt } from "../types";

function App() {
  // Keep backend-owned session and practice data at the page boundary.
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [attempts, setAttempts] = React.useState<PracticeAttempt[]>([]);
  const [authReady, setAuthReady] = React.useState(false);

  // Each new site visit starts at the login gate instead of silently restoring an old token.
  React.useEffect(() => {
    clearToken();
    setAuthReady(true);
  }, []);

  // Load dashboard data only after the backend confirms the current user.
  React.useEffect(() => {
    if (!user) return;
    fetchPracticeAttempts()
      .then((payload) => setAttempts(payload.attempts))
      .catch(() => setAttempts([]));
  }, [user]);

  // Store the JWT in localStorage through the shared API helper.
  const handleAuthed = React.useCallback((payload: { token: string; user: AuthUser }) => {
    setToken(payload.token);
    setUser(payload.user);
    return payload.user;
  }, []);

  const authenticateAccount = React.useCallback(
    async (username: string, password: string) => {
      return handleAuthed(await loginUser({ username, password }));
    },
    [handleAuthed],
  );

  const registerAccount = React.useCallback(
    async (username: string, password: string, role: "student" | "teacher") => {
      return handleAuthed(await registerUser({ username, password, name: username, role }));
    },
    [handleAuthed],
  );

  // Clear all user-scoped UI state when the session ends.
  function handleLogout() {
    clearToken();
    setUser(null);
    setAttempts([]);
  }

  // LegacyApp owns the UI flow; this page only supplies backend state/actions.
  return (
    <LegacyApp
      user={user}
      authReady={authReady}
      attempts={attempts}
      setAttempts={setAttempts}
      onLogin={authenticateAccount}
      onRegister={registerAccount}
      onLogout={handleLogout}
    />
  );
}

export default App;
