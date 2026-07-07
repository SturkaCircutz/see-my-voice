import type { PinyinDiagnosisIssue, PronunciationAnalysis } from "../types";
import type { LegacySyllable } from "./data";
import type { TeachingClipPlan } from "./legacyAppTypes";
import { clipSourceForUnit, getFocusSyllable, levelFromScore, pinyinPartsFor, playableClipTargetFor } from "./utils";

export function diagnosisIssueSummary(issue: PinyinDiagnosisIssue, syllables: LegacySyllable[]) {
  const syllable = syllables.find((item, index) => Number(issue.index) === index);
  const character = syllable?.character || issue.practice?.[0] || "this sound";
  const toneText = issue.type === "tone" && syllable?.tone ? `Tone ${syllable.tone.replace("T", "")}` : "";
  const typeText = issue.type === "initial"
    ? "Initial"
    : issue.type === "final"
      ? "Final"
      : issue.type === "tone"
        ? "Tone"
        : "Pronunciation";

  return {
    character,
    shortIssue: toneText ? `${toneText} may need work` : `${issue.focus || typeText} may need work`,
    label: toneText || issue.focus || issue.title || "Pronunciation focus",
  };
}

export function diagnosisDetailLines(issue: PinyinDiagnosisIssue) {
  return [
    issue.summary,
    issue.detail,
  ].filter(Boolean);
}

function issuePriority(issue?: PinyinDiagnosisIssue) {
  if (["initial", "final", "syllable", "missing"].includes(issue?.type || "")) return 0;
  if (issue?.type === "tone") return 1;
  return 2;
}

function teachingIssuesFor(analysis: PronunciationAnalysis) {
  return [...(analysis.pinyinDiagnosis?.issues || [])]
    .filter((issue) => issue.type !== "extra")
    .sort((left, right) => {
      const leftIndex = Number(left.index ?? 0);
      const rightIndex = Number(right.index ?? 0);
      if (leftIndex !== rightIndex) return leftIndex - rightIndex;
      return issuePriority(left) - issuePriority(right);
    });
}

function clipTargetFor(issue: PinyinDiagnosisIssue | undefined, syllable: LegacySyllable) {
  const parts = pinyinPartsFor(syllable);
  if (issue?.type === "initial" && parts.initial) return { type: "initial" as const, unit: parts.initial };
  if (issue?.type === "final" && parts.final) return { type: "final" as const, unit: parts.final };
  if (parts.final) return { type: "final" as const, unit: parts.final };
  return { type: "initial" as const, unit: parts.initial };
}

// Builds the teaching clip playlist from the diagnosis focus items.
export function buildTeachingClipPlan(analysis: PronunciationAnalysis, syllables: LegacySyllable[], targetText: string): TeachingClipPlan | null {
  const issues = teachingIssuesFor(analysis);
  const rows = issues.length
    ? issues.map((issue) => ({
        issue,
        syllable: syllables[Number(issue.index ?? 0)] || getFocusSyllable(syllables) || syllables[0],
      }))
    : [{
        issue: undefined,
        syllable: getFocusSyllable(syllables) || syllables[0],
      }];
  const segments = rows
    .filter((row): row is { issue?: PinyinDiagnosisIssue; syllable: LegacySyllable } => Boolean(row.syllable))
    .map(({ issue, syllable }) => {
      const issueTarget = clipTargetFor(issue, syllable);
      const target = playableClipTargetFor(syllable, issueTarget.type);
      const label = `${target.type === "initial" ? "Initial" : "Final"} ${target.unit}`;
      return {
        title: `${syllable.character} / ${syllable.pinyin}`,
        guidanceText: issue?.summary || issue?.detail || syllable.feedback || "Use the demo video to reinforce this syllable.",
        syllable,
        issue,
        clipType: target.type,
        clipUnit: target.unit,
        clipUrl: clipSourceForUnit(target.type, target.unit),
        practiceWords: issue?.practice?.length ? issue.practice : [syllable.character, targetText].filter(Boolean),
        videoTitle: `${label} Pronunciation Demo`,
      };
    });

  if (!segments.length) return null;
  const primarySegment = segments[0];
  return {
    title: segments.length > 1
      ? `${targetText || primarySegment.title} Personalized Teaching Video`
      : `${primarySegment.title} Personalized Teaching Video`,
    targetText,
    focusIssue: primarySegment.issue,
    targetSyllable: primarySegment.syllable,
    segments,
  };
}

export function scoreFillClass(score: number) {
  const level = levelFromScore(score);
  if (level === "focus") return "bg-[var(--red)]";
  if (level === "warn") return "bg-[var(--amber)]";
  return "bg-[var(--green)]";
}

export function toneFillClass(tone: string) {
  const colors: Record<string, string> = {
    "1": "bg-[var(--green)]",
    "2": "bg-[#f39b54]",
    "3": "bg-[#2fa692]",
    "4": "bg-[#35546e]",
  };
  return colors[tone] || "bg-[var(--green)]";
}
