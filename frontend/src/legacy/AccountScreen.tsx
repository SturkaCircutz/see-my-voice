import React from "react";
import type { AuthUser, PracticeAttempt } from "../types";
import type { ChatThread, Role, StudentTaskPackage } from "./data";
import { secondaryTeacherButtonClass } from "./legacyAppConstants";
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
  practiceStreak,
  publishedTasks,
  chatThreads: accountChatThreads,
  avatarDataUrl,
  localAccount,
  onLogout,
  onAvatarChange,
}: {
  role: Exclude<Role, "guest">;
  user: AuthUser | null;
  attempts: PracticeAttempt[];
  practiceStreak: number;
  publishedTasks: StudentTaskPackage[];
  chatThreads: ChatThread[];
  avatarDataUrl: string;
  localAccount: LocalAccountState;
  onLogout: () => void;
  onAvatarChange: (avatarDataUrl: string) => void;
}) {
  const signedIn = Boolean(user);
  const displayName = user?.name || localAccount.displayName || (role === "teacher" ? "Coach" : "Learner");
  const accountName = user?.username || localAccount.username || "Signed-in user";
  const participantId = role === "teacher" ? "teacher-main" : "learner-b";
  const unread = accountChatThreads
    .filter((thread) => thread.memberIds.includes(participantId))
    .reduce((sum, thread) => sum + unreadCount(thread, participantId), 0);
  const hasTodayTask = publishedTasks.some((task) => task.status === "Published");

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
      <div className={cn(contentClass, "lg:grid-cols-[minmax(320px,0.9fr)_minmax(360px,1.1fr)] lg:items-start")}>
        <section className={cn(panelClass, "grid gap-3.5 border-[rgba(32,154,120,0.22)] [background:linear-gradient(135deg,rgba(32,154,120,0.09),transparent_48%),var(--surface)]")} aria-labelledby="account-profile-title">
          <div className="grid grid-cols-[auto_1fr] items-center gap-3.5">
            <label className="grid cursor-pointer justify-items-center gap-[7px] text-[11px] font-extrabold text-[var(--green)]" aria-label="Change avatar">
              <Avatar name={displayName} src={avatarDataUrl} className="grid size-[58px] place-items-center rounded-full bg-[var(--green)] text-[23px] font-black text-white object-cover" />
              <input className="absolute size-px opacity-0" type="file" accept="image/*" onChange={updateAvatar} />
              <span>Change avatar</span>
            </label>
            <div>
              <span className={modelKickerClass}>{signedIn ? "Signed In" : "Account"}</span>
              <h2 className="m-0 text-[23px] text-[var(--ink)]" id="account-profile-title">{displayName}</h2>
              <p className="m-0 text-[13px] leading-[1.7] text-[var(--muted)]">Current: {role === "teacher" ? "Teacher" : "Learner"}. Your account syncs securely; avatar and draft chat preferences stay in this browser.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2" aria-label="Account status">
            <div className="grid gap-0.5 rounded-[13px] bg-[rgba(255,255,255,0.72)] px-2 py-2.5 text-center">
              <strong className="text-xl leading-none text-[var(--navy)]">{practiceStreak}</strong>
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

        <section className={cn(panelClass, "grid gap-3.5")} aria-labelledby="account-session-title">
          <div className="grid grid-cols-[1fr_auto] items-start gap-2.5">
            <div>
              <span className={modelKickerClass}>Account Access</span>
              <h2 className="m-0 text-[23px] text-[var(--ink)]" id="account-session-title">Session</h2>
            </div>
            <span className={statusPillClass}>{signedIn ? "Signed In" : "Not Signed In"}</span>
          </div>
          <div className="grid gap-2.5 rounded-[14px] bg-[#f8f5ef] p-3">
            <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
              <span className="font-extrabold text-[var(--muted)]">Role</span>
              <strong className="min-w-0 text-[var(--ink)]">{role === "teacher" ? "Teacher" : "Learner"}</strong>
              <span className="font-extrabold text-[var(--muted)]">Account</span>
              <strong className="min-w-0 overflow-hidden text-ellipsis text-[var(--ink)]">{accountName}</strong>
              <span className="font-extrabold text-[var(--muted)]">Last login</span>
              <strong className="min-w-0 text-[var(--ink)]">{localAccount.lastLoginAt || "Today"}</strong>
            </div>
            <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">
              To use another account or role, log out first and sign in again from the opening screen.
            </p>
          </div>
          <button className={secondaryTeacherButtonClass} type="button" onClick={onLogout}>
            Log Out
          </button>
        </section>

        <section className="px-1 pt-0.5 pb-1.5 text-[11px] leading-[1.6] text-[var(--muted)] lg:col-span-2" aria-label="Local data note">
          Your account stays available across sessions. Clearing browser data removes only the local avatar, navigation state, and chat draft data on this device.
        </section>
      </div>
    </section>
  );
}
