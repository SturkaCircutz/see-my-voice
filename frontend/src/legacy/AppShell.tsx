import React from "react";
import type { Role } from "./data";
import { databaseSections } from "./legacyAppConstants";
import {
  brandAccentClass,
  cn,
  modelKickerClass,
  panelClass,
  screenClass,
  statusPillClass,
  warnStatusPillClass,
} from "./styles";
import { statusTime } from "./utils";

type LoginMode = "login" | "register";

export function ResponsiveShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#ece8df] lg:grid lg:place-items-center lg:px-6 lg:py-6 max-lg:p-0">
      <div className="relative h-[100dvh] min-h-[620px] w-full overflow-hidden bg-[var(--paper)] shadow-none lg:h-[min(900px,calc(100vh-48px))] lg:min-h-[720px] lg:w-[min(1180px,calc(100vw-48px))] lg:rounded-[28px] lg:border lg:border-[var(--line-strong)] lg:shadow-[var(--shadow)]">
        {children}
      </div>
    </div>
  );
}

export function LoginScreen({
  role,
  busy,
  message,
  onRoleChange,
  onSubmit,
}: {
  role: Exclude<Role, "guest">;
  busy: boolean;
  message: string;
  onRoleChange: (role: Exclude<Role, "guest">) => void;
  onSubmit: (input: {
    role: Exclude<Role, "guest">;
    mode: LoginMode;
    username: string;
    password: string;
  }) => Promise<void> | void;
}) {
  const [mode, setMode] = React.useState<LoginMode>("login");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const accountInputClass = "w-full min-w-0 rounded-xl border border-[rgba(53,84,110,0.18)] bg-white px-3 py-[11px] text-[var(--ink)]";
  const accountFieldClass = "grid gap-[5px] text-[11px] font-extrabold text-[var(--muted)]";
  const toggleClass = (selected: boolean) =>
    `grid min-h-[42px] cursor-pointer place-items-center rounded-[11px] text-[13px] font-black ${
      selected ? "bg-[var(--green)] text-white" : "bg-transparent text-[var(--muted)]"
    }`;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      role,
      mode,
      username: username.trim(),
      password,
    });
  }

  return (
    <section
      className={cn(
        screenClass,
        "flex min-h-full flex-col [background:linear-gradient(180deg,rgba(25,26,47,0.96),rgba(25,26,47,0.92)_42%,var(--paper)_42%),var(--paper)] lg:grid lg:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)] lg:[background:linear-gradient(90deg,rgba(25,26,47,0.97),rgba(25,26,47,0.93)_42%,var(--paper)_42%),var(--paper)]",
      )}
      data-screen="login"
    >
      <header className="min-h-[285px] px-[22px] pt-[38px] pb-[30px] text-white lg:grid lg:min-h-0 lg:content-center lg:px-10 lg:py-12">
        <div className="mb-[21px] flex items-center justify-between gap-3 text-xs font-bold tracking-[0.04em] text-[rgba(255,255,255,0.72)] lg:mb-10 lg:flex-wrap lg:justify-start">
          <span>{statusTime()}</span>
          <span>VoiceSight · See My Voice</span>
        </div>
        <div>
          <h1 className="mt-[54px] mb-2 text-[42px] font-bold tracking-normal text-[var(--red)] [text-shadow:0_8px_24px_rgba(207,75,49,0.16)] lg:mt-0 lg:max-w-[420px] lg:text-[56px] lg:leading-[1.02]">
            See My Voice
          </h1>
          <p className="m-0 max-w-[315px] text-[15px] font-bold leading-[1.7] text-[rgba(255,255,255,0.72)] lg:max-w-[370px] lg:text-base">
            Sign in as a learner or teacher to use Mandarin pronunciation practice.
          </p>
        </div>
      </header>

      <div className="grid gap-3.5 px-[18px] pb-6 lg:max-h-full lg:content-center lg:overflow-y-auto lg:px-8 lg:py-10 xl:px-10">
        <section className={cn(panelClass, "grid gap-3.5")} aria-labelledby="login-title">
          <div className="grid gap-1">
            <span className={modelKickerClass}>Required Account</span>
            <h2 className="m-0 text-[25px] text-[var(--ink)] lg:text-[30px]" id="login-title">
              {mode === "login" ? "Log In" : "Create Account"}
            </h2>
            <p className="m-0 text-sm leading-[1.6] text-[var(--muted)]">
              Choose your role first. The same account form supports teacher and student access.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-[#f4f1eb] p-1" role="radiogroup" aria-label="Choose account role">
            <label className={toggleClass(role === "student")}>
              <input
                className="pointer-events-none absolute opacity-0"
                type="radio"
                name="landing-role"
                value="student"
                checked={role === "student"}
                onChange={() => onRoleChange("student")}
              />
              <span>Student Login</span>
            </label>
            <label className={toggleClass(role === "teacher")}>
              <input
                className="pointer-events-none absolute opacity-0"
                type="radio"
                name="landing-role"
                value="teacher"
                checked={role === "teacher"}
                onChange={() => onRoleChange("teacher")}
              />
              <span>Teacher Login</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-[#f4f1eb] p-1" role="tablist" aria-label="Choose login mode">
            <button className={toggleClass(mode === "login")} type="button" onClick={() => setMode("login")}>
              Log In
            </button>
            <button className={toggleClass(mode === "register")} type="button" onClick={() => setMode("register")}>
              Register
            </button>
          </div>

          <form className="grid gap-2.5" onSubmit={submit}>
            <label className={accountFieldClass}>
              <span>Account</span>
              <input
                className={accountInputClass}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoComplete="username"
                placeholder={role === "teacher" ? "Teacher account" : "Student account"}
              />
            </label>
            <label className={accountFieldClass}>
              <span>Password</span>
              <input
                className={accountInputClass}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={3}
                required
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                placeholder="At least 3 characters"
              />
            </label>
            <button className="w-full rounded-[13px] bg-[var(--navy)] text-[13px] font-extrabold text-white" type="submit" disabled={busy}>
              {busy ? "Connecting..." : mode === "register" ? `Register as ${role === "teacher" ? "Teacher" : "Student"}` : `Log In as ${role === "teacher" ? "Teacher" : "Student"}`}
            </button>
            {message ? (
              <p className="m-0 rounded-xl bg-[var(--red-soft)] px-3 py-2 text-xs font-bold leading-[1.5] text-[var(--red)]" role="alert">
                {message}
              </p>
            ) : null}
          </form>
        </section>

        <section className={cn(panelClass, "grid gap-3 border-[rgba(32,154,120,0.22)] [background:linear-gradient(135deg,rgba(32,154,120,0.09),transparent_48%),var(--surface)]")} aria-labelledby="login-access-title">
          <span className={modelKickerClass}>Access</span>
          <strong className="text-[17px] text-[var(--ink)]" id="login-access-title">
            <span className={brandAccentClass}>VoiceSight</span> opens after account verification
          </strong>
          <p className="m-0 text-xs leading-[1.6] text-[var(--muted)]">
            Student accounts open practice, tasks, progress, chat, and Me. Teacher accounts open learner management, task publishing, reviews, chat, and account settings.
          </p>
        </section>
      </div>
    </section>
  );
}

export function LoadingShell() {
  return (
    <ResponsiveShell>
      <main id="app" className="h-full overflow-x-hidden overflow-y-auto overscroll-contain pb-[92px] lg:pb-0">
        <section className={cn(screenClass, "grid place-content-center gap-2.5 font-bold text-[var(--muted)]")}>
          <span>Loading See My Voice</span>
        </section>
      </main>
    </ResponsiveShell>
  );
}

export function HomeScreen({ onSelectRole }: { onSelectRole: (role: Exclude<Role, "guest">) => void }) {
  return (
    <section
      className={cn(
        screenClass,
        "flex min-h-full flex-col [background:linear-gradient(180deg,rgba(25,26,47,0.96),rgba(25,26,47,0.92)_46%,var(--paper)_46%),var(--paper)] lg:grid lg:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)] lg:[background:linear-gradient(90deg,rgba(25,26,47,0.97),rgba(25,26,47,0.93)_42%,var(--paper)_42%),var(--paper)]",
      )}
      data-screen="home"
    >
      <header className="min-h-[315px] px-[22px] pt-[38px] pb-[30px] text-white lg:grid lg:min-h-0 lg:content-center lg:px-10 lg:py-12">
        <div className="mb-[21px] flex items-center justify-between gap-3 text-xs font-bold tracking-[0.04em] text-[rgba(255,255,255,0.72)] lg:mb-10 lg:flex-wrap lg:justify-start lg:text-[rgba(255,255,255,0.7)]">
          <span>{statusTime()}</span>
          <span>VoiceSight · See My Voice</span>
        </div>
        <div>
          <h1 className="mt-[70px] mb-2 text-[42px] font-bold tracking-normal text-[var(--red)] shadow-none [text-shadow:0_8px_24px_rgba(207,75,49,0.16)] lg:mt-0 lg:max-w-[420px] lg:text-[56px] lg:leading-[1.02]">
            See My Voice
          </h1>
          <p className="m-0 max-w-[270px] text-[15px] font-bold leading-[1.7] text-[rgba(255,255,255,0.72)] lg:max-w-[360px] lg:text-base">
            Mandarin pronunciation practice for foreign learners
          </p>
        </div>
      </header>
      <div className="grid gap-3.5 px-[18px] pb-6 lg:max-h-full lg:content-center lg:overflow-y-auto lg:px-8 lg:py-10 xl:px-10">
        <button
          className="grid min-h-[156px] content-start gap-2 rounded-[18px] border border-[rgba(32,154,120,0.28)] bg-[var(--surface)] p-[22px] text-left shadow-[0_18px_42px_rgba(25,26,47,0.1)] lg:min-h-[170px] lg:p-7"
          type="button"
          onClick={() => onSelectRole("student")}
        >
          <span className={modelKickerClass}>Learner</span>
          <strong className="text-[25px] tracking-normal text-[var(--ink)] lg:text-[30px]">Practice Today</strong>
          <p className="m-0 text-sm leading-[1.6] text-[var(--muted)]">Recording analysis, pronunciation details, teaching clips, and progress tracking.</p>
        </button>
        <button
          className="grid min-h-[156px] content-start gap-2 rounded-[18px] border border-[rgba(207,75,49,0.28)] bg-[var(--surface)] p-[22px] text-left shadow-[0_18px_42px_rgba(25,26,47,0.1)] lg:min-h-[170px] lg:p-7"
          type="button"
          onClick={() => onSelectRole("teacher")}
        >
          <span className={modelKickerClass}>Teacher</span>
          <strong className="text-[25px] tracking-normal text-[var(--ink)] lg:text-[30px]">Mandarin Practice Management</strong>
          <p className="m-0 text-sm leading-[1.6] text-[var(--muted)]">Learner management, practice packs, recording reviews, and feedback chat.</p>
        </button>
        <DatabaseOverview />
      </div>
    </section>
  );
}

function DatabaseOverview() {
  return (
    <section className={cn(panelClass, "grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,1.05fr)] lg:items-start")} aria-labelledby="database-overview-title">
      <div className="grid gap-1">
        <span className={modelKickerClass}>Online Database</span>
        <strong className="text-[17px] text-[var(--ink)]" id="database-overview-title">see_my_voice collections</strong>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-white lg:row-span-2">
        <img
          className="block h-auto w-full"
          src="/assets/see-my-voice-database.png"
          alt="MongoDB Atlas see_my_voice database collection list"
        />
      </div>
      <div className="grid gap-2">
        {databaseSections.map((item) => (
          <article className="grid gap-1 rounded-[12px] border border-[var(--line)] bg-[#fbfaf7] px-3 py-2.5" key={item.collection}>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <strong className="text-[12px] text-[var(--ink)]">{item.section}</strong>
              <span className={item.documents ? statusPillClass : warnStatusPillClass}>{item.documents} docs</span>
            </div>
            <code className="text-[11px] font-bold text-[var(--green)]">{item.collection}</code>
            <p className="m-0 text-[11px] leading-[1.45] text-[var(--muted)]">{item.data}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
