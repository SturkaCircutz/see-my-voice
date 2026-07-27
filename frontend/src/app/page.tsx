"use client";

import React from "react";
import {
  fetchPracticeAttempts,
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../api";
import { LegacyApp } from "../LegacyApp";
import type { AuthUser, PracticeAttempt } from "../types";

function App() {
  // Keep backend-owned session and practice data at the page boundary.
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [attempts, setAttempts] = React.useState<PracticeAttempt[]>([]);
  const [authReady, setAuthReady] = React.useState(false);

  // Restore the HTTP-only cookie session when one exists.
  React.useEffect(() => {
    fetchCurrentUser()
      .then((payload) => setUser(payload.user))
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true));
  }, []);

  // Load dashboard data only after the backend confirms the current user.
  React.useEffect(() => {
    if (!user) return;
    fetchPracticeAttempts()
      .then((payload) => setAttempts(payload.attempts))
      .catch(() => setAttempts([]));
  }, [user]);

  // Login/register responses set the session cookie; the page only stores public user state.
  const handleAuthed = React.useCallback((payload: { user: AuthUser }) => {
    setUser(payload.user);
    return payload.user;
  }, []);

  const authenticateAccount = React.useCallback(
    async (username: string, password: string, role: "student" | "teacher") => {
      return handleAuthed(await loginUser({ username, password, role }));
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
  async function handleLogout() {
    await logoutUser().catch(() => undefined);
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
