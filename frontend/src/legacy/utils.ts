import { defaultSyllables, teacherNavItems, type ChatThread, type LegacySyllable, type TeacherView } from "./data";
import type { PracticeAttempt, PronunciationAnalysis, SyllableFeedback } from "../types";

// API syllable feedback is merged with legacy display metadata for existing screens.
export function normalizeSyllables(items?: SyllableFeedback[]): LegacySyllable[] {
  if (!items?.length) return defaultSyllables;
  return items.map((item, index) => {
    const fallback = defaultSyllables[index] || defaultSyllables.find((syllable) => syllable.id === item.id) || defaultSyllables[0];
    return {
      ...fallback,
      ...item,
      tone: item.focus || fallback.tone,
      level: levelFromScore(item.score),
      status: statusFromScore(item.score),
      targetTone: fallback.targetTone,
      currentTone: fallback.currentTone,
    };
  });
}

// Prefer the newest completed attempt when no fresh in-session analysis exists.
export function latestCompleteAnalysis(attempts: PracticeAttempt[]): PronunciationAnalysis | null {
  return attempts.find((attempt) => attempt.analysis && isUsableAnalysis(attempt.analysis))?.analysis || null;
}

export function isUsableAnalysis(analysis: PronunciationAnalysis): boolean {
  const raw = analysis.raw;
  const speechRegion = raw && typeof raw === "object"
    ? (raw as { tone_timing?: { speech_region?: { reason?: string } } }).tone_timing?.speech_region
    : null;
  const noSpeechEnergy = speechRegion?.reason === "No clear speech energy was detected.";
  const hasAnySyllableSignal = analysis.syllables.some((syllable) => syllable.score > 0);
  const hasAnyScoreSignal = analysis.scores.overall > 0 || analysis.scores.tone > 0 || analysis.scores.clarity > 0;

  return !noSpeechEnergy || hasAnySyllableSignal || hasAnyScoreSignal;
}

// Scores can live on the nested analysis or legacy attempt shape.
export function attemptScore(attempt?: PracticeAttempt): number {
  return attempt?.analysis?.scores.overall ?? attempt?.scores?.overall ?? 0;
}

// The weakest syllable drives the practice focus label.
export function getFocusSyllable(syllables: LegacySyllable[]): LegacySyllable | null {
  if (!syllables.length) return null;
  return [...syllables].sort((left, right) => left.score - right.score)[0];
}

// Convert numeric scores to CSS status levels.
export function levelFromScore(score: number): LegacySyllable["level"] {
  if (score >= 82) return "good";
  if (score >= 68) return "warn";
  return "focus";
}

// Convert numeric scores to short learner-facing status text.
export function statusFromScore(score: number) {
  if (score >= 82) return "Clear";
  if (score >= 68) return "Needs Work";
  return "Focus Practice";
}

export function unreadCount(thread: ChatThread, participantId: string) {
  return thread.messages.filter((message) => message.senderId !== participantId && !message.readBy.includes(participantId)).length;
}

export function threadTypeLabel(thread: ChatThread) {
  return thread.type === "class" ? "Class Group" : "Teacher Chat";
}

// Header time is computed at render time for the responsive app shell.
export function statusTime() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Derive up to two initials for generated avatar placeholders.
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizePinyinUnit(value?: string) {
  return String(value || "").toLowerCase().replace(/ü/g, "v").replace(/u:/g, "v");
}

function splitZeroInitialSpelling(pinyinBody: string) {
  if (!pinyinBody) return null;
  if (pinyinBody === "yi") return { initial: "", final: "i" };
  if (pinyinBody === "wu") return { initial: "", final: "u" };
  if (pinyinBody === "yu") return { initial: "", final: "v" };
  if (pinyinBody === "ye") return { initial: "", final: "ie" };
  if (pinyinBody === "yue") return { initial: "", final: "ve" };
  if (pinyinBody === "yuan") return { initial: "", final: "van" };
  if (pinyinBody === "yun") return { initial: "", final: "vn" };
  if (pinyinBody === "yin") return { initial: "", final: "in" };
  if (pinyinBody === "ying") return { initial: "", final: "ing" };
  if (pinyinBody === "you") return { initial: "", final: "iu" };
  if (pinyinBody === "ya") return { initial: "", final: "ia" };
  if (pinyinBody === "yan") return { initial: "", final: "ian" };
  if (pinyinBody === "yao") return { initial: "", final: "iao" };
  if (pinyinBody === "yang") return { initial: "", final: "iang" };
  if (pinyinBody === "yong") return { initial: "", final: "iong" };
  if (pinyinBody === "wo") return { initial: "", final: "uo" };
  if (pinyinBody === "wei") return { initial: "", final: "ui" };
  if (pinyinBody === "wen") return { initial: "", final: "un" };
  if (pinyinBody === "weng") return { initial: "", final: "ueng" };
  if (pinyinBody.startsWith("y")) return { initial: "", final: `i${pinyinBody.slice(1)}` };
  if (pinyinBody.startsWith("w")) return { initial: "", final: `u${pinyinBody.slice(1)}` };
  return null;
}

export function pinyinPartsFor(syllable: LegacySyllable) {
  const initials = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s"];
  const pinyinBody = normalizePinyinUnit(syllable.pinyin).replace(/\d/g, "");
  const zeroInitial = splitZeroInitialSpelling(pinyinBody);
  if (zeroInitial) return zeroInitial;
  const initial = initials.find((item) => pinyinBody.startsWith(item)) || "";
  let final = initial ? pinyinBody.slice(initial.length) : pinyinBody;
  if (final === "i" && ["z", "c", "s"].includes(initial)) final = "i_z";
  if (final === "i" && ["zh", "ch", "sh", "r"].includes(initial)) final = "i_zh";
  return { initial, final };
}

export function clipSourceForUnit(type: "initial" | "final", unit: string) {
  const normalized = normalizePinyinUnit(unit);
  return normalized ? `/assets/pronunciation-clips/${type}-${normalized}.mp4` : "";
}

// Map focus syllables to bundled pronunciation clips copied from the static prototype.
export function clipSourceFor(syllable: LegacySyllable, preferredType: "initial" | "final" = "final") {
  const parts = pinyinPartsFor(syllable);
  if (preferredType === "initial" && parts.initial) return clipSourceForUnit("initial", parts.initial);
  if (parts.final) return clipSourceForUnit("final", parts.final);
  if (parts.initial) return clipSourceForUnit("initial", parts.initial);
  return "/assets/pronunciation-clips/final-an.mp4";
}

// Convert tone sample values into an SVG polyline path.
export function tonePoints(values: number[]) {
  const width = 292;
  const height = 92;
  return values
    .map((value, index) => {
      const x = 14 + (width * index) / Math.max(values.length - 1, 1);
      const y = 16 + (height * value) / 100;
      return `${x},${y}`;
    })
    .join(" ");
}

// Resolve a teacher tab id to its display label.
export function teacherViewLabel(view: TeacherView) {
  const item = teacherNavItems.find((navItem) => navItem.view === view);
  return item?.label || "Home";
}
