"use client";

import React from "react";
import {
  clearToken,
  fetchCurrentUser,
  fetchPracticeAttempts,
  getToken,
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

  // Restore a saved login token in the background so the legacy-style shell can paint immediately.
  React.useEffect(() => {
    if (!getToken()) return;
    fetchCurrentUser()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => clearToken());
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
  }, []);

  const authenticateAccount = React.useCallback(
    async (username: string, password: string) => {
      try {
        handleAuthed(await loginUser({ username, password }));
        return;
      } catch (loginError) {
        const message = loginError instanceof Error ? loginError.message : "";
        if (!message.toLowerCase().includes("incorrect")) throw loginError;
      }

      try {
        handleAuthed(await registerUser({ username, password, name: username }));
      } catch (registerError) {
        const message = registerError instanceof Error ? registerError.message : "";
        if (message.toLowerCase().includes("already registered")) {
          throw new Error("That account already exists. Check the password and try again.");
        }
        throw registerError;
      }
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
      attempts={attempts}
      setAttempts={setAttempts}
      onLogin={authenticateAccount}
      onLogout={handleLogout}
    />
  );
}

export default App;
