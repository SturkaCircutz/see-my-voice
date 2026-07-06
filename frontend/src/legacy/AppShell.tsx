import React from "react";
import type { Role } from "./data";
import { databaseSections } from "./legacyAppConstants";
import {
  cn,
  modelKickerClass,
  panelClass,
  screenClass,
  statusPillClass,
  warnStatusPillClass,
} from "./styles";
import { statusTime } from "./utils";

export function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-7 max-[639px]:p-0">
      <div className="relative h-[min(884px,calc(100vh-56px))] min-h-[690px] w-[min(100%,410px)] overflow-hidden rounded-[46px] border-[9px] border-[var(--navy)] bg-[var(--paper)] shadow-[var(--shadow)] max-[639px]:h-[100dvh] max-[639px]:min-h-[620px] max-[639px]:w-full max-[639px]:rounded-none max-[639px]:border-0 max-[639px]:shadow-none">
        {children}
      </div>
    </div>
  );
}

export function LoadingShell() {
  return (
    <PhoneShell>
      <main id="app" className="h-full overflow-x-hidden overflow-y-auto overscroll-contain pb-[92px]">
        <section className={cn(screenClass, "grid place-content-center gap-2.5 font-bold text-[var(--muted)]")}>
          <span>Loading See My Voice</span>
        </section>
      </main>
    </PhoneShell>
  );
}

export function HomeScreen({ onSelectRole }: { onSelectRole: (role: Exclude<Role, "guest">) => void }) {
  return (
    <section
      className={cn(screenClass, "flex min-h-full flex-col [background:linear-gradient(180deg,rgba(25,26,47,0.96),rgba(25,26,47,0.92)_46%,var(--paper)_46%),var(--paper)]")}
      data-screen="home"
    >
      <header className="min-h-[315px] px-[22px] pt-[38px] pb-[30px] text-[var(--ink)]">
        <div className="mb-[21px] flex items-center justify-between text-xs font-bold tracking-[0.04em] text-[rgba(41,40,59,0.72)]">
          <span>{statusTime()}</span>
          <span>VoiceSight · See My Voice</span>
        </div>
        <div>
          <h1 className="mt-[70px] mb-2 text-[42px] font-bold tracking-normal text-[var(--red)] shadow-none [text-shadow:0_8px_24px_rgba(207,75,49,0.16)]">
            See My Voice
          </h1>
          <p className="m-0 max-w-[270px] text-[15px] font-bold leading-[1.7] text-[rgba(41,40,59,0.72)]">
            Mandarin pronunciation practice for foreign learners
          </p>
        </div>
      </header>
      <div className="grid gap-3.5 px-[18px] pb-6">
        <button
          className="grid min-h-[156px] content-start gap-2 rounded-[18px] border border-[rgba(32,154,120,0.28)] bg-[var(--surface)] p-[22px] text-left shadow-[0_18px_42px_rgba(25,26,47,0.1)]"
          type="button"
          onClick={() => onSelectRole("student")}
        >
          <span className={modelKickerClass}>Learner</span>
          <strong className="text-[25px] tracking-normal text-[var(--ink)]">Practice Today</strong>
          <p className="m-0 text-sm leading-[1.6] text-[var(--muted)]">Recording analysis, pronunciation details, teaching clips, and progress tracking.</p>
        </button>
        <button
          className="grid min-h-[156px] content-start gap-2 rounded-[18px] border border-[rgba(207,75,49,0.28)] bg-[var(--surface)] p-[22px] text-left shadow-[0_18px_42px_rgba(25,26,47,0.1)]"
          type="button"
          onClick={() => onSelectRole("teacher")}
        >
          <span className={modelKickerClass}>Teacher</span>
          <strong className="text-[25px] tracking-normal text-[var(--ink)]">Mandarin Practice Management</strong>
          <p className="m-0 text-sm leading-[1.6] text-[var(--muted)]">Learner management, practice packs, recording reviews, and feedback chat.</p>
        </button>
        <DatabaseOverview />
      </div>
    </section>
  );
}

function DatabaseOverview() {
  return (
    <section className={cn(panelClass, "grid gap-3")} aria-labelledby="database-overview-title">
      <div className="grid gap-1">
        <span className={modelKickerClass}>Online Database</span>
        <strong className="text-[17px] text-[var(--ink)]" id="database-overview-title">see_my_voice collections</strong>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-white">
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
