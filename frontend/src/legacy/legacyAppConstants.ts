import type { PronunciationAnalysis } from "../types";
import { defaultScores, defaultSyllables } from "./data";
import { panelClass } from "./styles";

export const STORAGE_KEY = "see-my-voice-practice-state";

export const fallbackAnalysis: PronunciationAnalysis = {
  // Fallback analysis keeps the UI populated before the first recording.
  heardText: "Waiting for recording analysis",
  summary:
    "Enter a Chinese sentence to practice. After recording, the system will give tone, clarity, and rhythm feedback based on your pronunciation.",
  scores: defaultScores,
  syllables: defaultSyllables,
};

// Shared utility classes used by the legacy teacher and task screens.
export const primaryTeacherButtonClass = "w-full rounded-[13px] bg-[var(--navy)] text-[13px] font-extrabold text-white";
export const secondaryTeacherButtonClass = "w-full rounded-xl border border-[rgba(53,84,110,0.22)] bg-white text-xs font-extrabold text-[var(--navy)]";
export const teacherTaskMetaClass = "flex flex-wrap gap-1.5";
export const teacherTaskMetaItemClass = "rounded-full bg-[var(--green-soft)] px-2 py-[5px] text-[10px] font-extrabold text-[var(--green)]";
export const teacherScoreStripClass = "grid grid-cols-3 gap-1.5";
export const teacherScorePillClass = "rounded-[9px] bg-[rgba(53,84,110,0.08)] px-1.5 py-[7px] text-center text-[10px] font-extrabold text-[var(--navy)]";
export const teacherReviewHeadingClass = "grid grid-cols-[1fr_auto] items-start gap-2.5";
export const teacherReviewScoreClass = "min-w-12 text-right text-lg font-black text-[var(--red)]";
export const teacherTagListClass = "flex flex-wrap gap-1.5";
export const teacherTagClass = "rounded-full bg-[var(--amber-soft)] px-[9px] py-1.5 text-[11px] font-bold text-[var(--amber)]";
export const templateFieldClass = "grid gap-[7px] text-xs font-black text-[var(--muted)]";
export const templateInputClass = "w-full rounded-xl border border-[var(--line)] bg-[#fbfaf7] px-[13px] py-3 font-extrabold leading-[1.55] text-[var(--ink)]";
export const assessmentStepClass = "grid grid-cols-[42px_minmax(0,1fr)] items-start gap-3";
export const assessmentStepNumberClass = "grid size-[38px] place-items-center rounded-full bg-[var(--navy)] font-black text-white";
export const assessmentSectionClass = `${panelClass} grid gap-3.5`;
export const teacherFilterButtonBaseClass = "min-h-[38px] rounded-[10px] bg-[#f2eee7] px-2.5 py-2 text-left text-xs font-extrabold text-[var(--navy)]";
