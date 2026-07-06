import React from "react";
import type { AuthUser, PracticeAttempt } from "../types";
import type { ChatThread, Role, StudentTaskPackage } from "./data";
import {
  primaryTeacherButtonClass,
  secondaryTeacherButtonClass,
} from "./legacyAppConstants";
import type { LocalAccountState } from "./legacyAppTypes";
import { Avatar } from "./ui";
import {
  appHeaderClass,
  brandAccentClass,
  brandClass,
  brandRowClass,
  cn,
  contentClass,
  modelKickerClass,
  panelClass,
  screenClass,
  statusPillClass,
  statusRowClass,
} from "./styles";
import { statusTime, unreadCount } from "./utils";

export function AccountScreen({
  role,
  user,
  attempts,
  publishedTasks,
  chatThreads: accountChatThreads,
  avatarDataUrl,
  localAccount,
  onRoleChange,
  onLogin,
  onLocalLogin,
  onLogout,
  onAvatarChange,
}: {
  role: Exclude<Role, "guest">;
  user: AuthUser | null;
  attempts: PracticeAttempt[];
  publishedTasks: StudentTaskPackage[];
  chatThreads: ChatThread[];
  avatarDataUrl: string;
  localAccount: LocalAccountState;
  onRoleChange: (role: Exclude<Role, "guest">) => void;
  onLogin: (username: string, password: string) => Promise<void> | void;
  onLocalLogin: (role: Exclude<Role, "guest">, username: string, password: string) => void;
  onLogout: () => void;
  onAvatarChange: (avatarDataUrl: string) => void;
}) {
  // Form state is local to the account screen.
  const [username, setUsername] = React.useState(user?.username || localAccount.username || "jiawen");
  const [password, setPassword] = React.useState(localAccount.password || "");
  const [busy, setBusy] = React.useState(false);
  const [formMessage, setFormMessage] = React.useState("");
  const signedIn = Boolean(user);
  const displayName = user?.name || localAccount.displayName || (role === "teacher" ? "Ms. Wang" : "Chen Xiaohe");
  const participantId = role === "teacher" ? "teacher-main" : "student-chen";
  const unread = accountChatThreads
    .filter((thread) => thread.memberIds.includes(participantId))
    .reduce((sum, thread) => sum + unreadCount(thread, participantId), 0);
  const hasTodayTask = publishedTasks.some((task) => task.status === "Published");
  const accountInputClass = "w-full min-w-0 rounded-xl border border-[rgba(53,84,110,0.18)] bg-white px-3 py-[11px] text-[var(--ink)]";
  const accountFieldClass = "grid gap-[5px] text-[11px] font-extrabold text-[var(--muted)]";
  const accountToggleClass = (selected: boolean) =>
    `grid min-h-[42px] cursor-pointer place-items-center rounded-[11px] text-[13px] font-black ${
      selected ? "bg-[var(--green)] text-white" : "bg-transparent text-[var(--muted)]"
    }`;

  // Login first, then mirror successful account data into the legacy local state.
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormMessage("");
    try {
      await onLogin(username, password);
      onLocalLogin(role, username, password);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Account could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function updateAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => onAvatarChange(String(reader.result || "")));
    reader.readAsDataURL(file);
  }

  return (
    <section className={screenClass} data-screen="account">
      <header className={appHeaderClass}>
        <div className={statusRowClass}>
          <span>{statusTime()}</span>
          <span>Account</span>
        </div>
        <div className={brandRowClass}>
          <div>
            <h1 className={brandClass}>
              <span className={brandAccentClass}>VoiceSight</span> Account
            </h1>
            <p className="mt-[7px] mb-0 text-xs text-[rgba(255,255,255,0.54)]">Current: {role === "teacher" ? "Teacher" : "Learner"}</p>
          </div>
        </div>
      </header>
      <div className={contentClass}>
        <section className={cn(panelClass, "grid gap-3.5 border-[rgba(32,154,120,0.22)] [background:linear-gradient(135deg,rgba(32,154,120,0.09),transparent_48%),var(--surface)]")} aria-labelledby="account-profile-title">
          <div className="grid grid-cols-[auto_1fr] items-center gap-3.5">
            <label className="grid cursor-pointer justify-items-center gap-[7px] text-[11px] font-extrabold text-[var(--green)]" aria-label="Change avatar">
              <Avatar name={displayName} src={avatarDataUrl} className="grid size-[58px] place-items-center rounded-full bg-[var(--green)] text-[23px] font-black text-white object-cover" />
              <input className="absolute size-px opacity-0" type="file" accept="image/*" onChange={updateAvatar} />
              <span>Change avatar</span>
            </label>
            <div>
              <span className={modelKickerClass}>{signedIn ? "Signed In" : "MongoDB Account"}</span>
              <h2 className="m-0 text-[23px] text-[var(--ink)]" id="account-profile-title">{displayName}</h2>
              <p className="m-0 text-[13px] leading-[1.7] text-[var(--muted)]">Current: {role === "teacher" ? "Teacher" : "Learner"}. Account sign-in is saved in MongoDB; avatar and chat identity stay in this browser.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2" aria-label="Account status">
            <div className="grid gap-0.5 rounded-[13px] bg-[rgba(255,255,255,0.72)] px-2 py-2.5 text-center">
              <strong className="text-xl leading-none text-[var(--navy)]">{Math.max(1, attempts.length || 1)}</strong>
              <span className="text-[10px] font-extrabold text-[var(--muted)]">Practice Streak</span>
            </div>
            <div className="grid gap-0.5 rounded-[13px] bg-[rgba(255,255,255,0.72)] px-2 py-2.5 text-center">
              <strong className="text-xl leading-none text-[var(--navy)]">{unread}</strong>
              <span className="text-[10px] font-extrabold text-[var(--muted)]">Unread Messages</span>
            </div>
            <div className="grid gap-0.5 rounded-[13px] bg-[rgba(255,255,255,0.72)] px-2 py-2.5 text-center">
              <strong className="text-xl leading-none text-[var(--navy)]">{hasTodayTask ? "Yes" : "No"}</strong>
              <span className="text-[10px] font-extrabold text-[var(--muted)]">Today Tasks</span>
            </div>
          </div>
        </section>

        <section className={cn(panelClass, "grid gap-3.5")} aria-labelledby="account-login-title">
          <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
            <div>
              <span className={modelKickerClass}>Account Settings</span>
              <h2 className="m-0 text-[23px] text-[var(--ink)]" id="account-login-title">{signedIn ? "Update Login Info" : "Log In or Create Account"}</h2>
            </div>
            <span className={statusPillClass}>{signedIn ? "Saved" : "Not Signed In"}</span>
          </div>
          <form className="grid gap-2.5" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-[#f4f1eb] p-1" role="radiogroup" aria-label="Choose login role">
              <label className={accountToggleClass(role === "student")}>
                <input
                  className="pointer-events-none absolute opacity-0"
                  type="radio"
                  name="login-role"
                  value="student"
                  checked={role === "student"}
                  onChange={() => onRoleChange("student")}
                />
                <span>Learner</span>
              </label>
              <label className={accountToggleClass(role === "teacher")}>
                <input
                  className="pointer-events-none absolute opacity-0"
                  type="radio"
                  name="login-role"
                  value="teacher"
                  checked={role === "teacher"}
                  onChange={() => onRoleChange("teacher")}
                />
                <span>Teacher</span>
              </label>
            </div>
            <label className={accountFieldClass}>
              <span>Account</span>
              <input className={accountInputClass} value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" placeholder="Enter account" />
            </label>
            <label className={accountFieldClass}>
              <span>Password</span>
              <input
                className={accountInputClass}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={3}
                required={!signedIn}
                autoComplete="current-password"
                placeholder="Enter password"
              />
            </label>
            <button className={primaryTeacherButtonClass} type="submit" disabled={busy}>
              {busy ? "Connecting..." : signedIn ? "Save Account" : "Log In or Create"}
            </button>
            {formMessage && (
              <p className="m-0 rounded-xl bg-[var(--red-soft)] px-3 py-2 text-xs font-bold leading-[1.5] text-[var(--red)]">
                {formMessage}
              </p>
            )}
            {signedIn && (
              <button className={secondaryTeacherButtonClass} type="button" onClick={onLogout}>
                Log Out
              </button>
            )}
          </form>
        </section>

        <section className="px-1 pt-0.5 pb-1.5 text-[11px] leading-[1.6] text-[var(--muted)]" aria-label="Local data note">
          Account credentials are stored by the backend in MongoDB. Clearing browser data removes only the local avatar, navigation state, and chat draft data.
        </section>
      </div>
    </section>
  );
}
