import { config } from "./config.js";

export interface ScoreSet {
  overall: number;
  tone: number;
  clarity: number;
  rhythm: number;
}

export interface SyllableFeedback {
  id: string;
  character: string;
  pinyin: string;
  score: number;
  focus: string;
  feedback: string;
}

export interface PinyinDiagnosisIssue {
  index?: number;
  type?: string;
  title?: string;
  summary?: string;
  focus?: string;
  detail?: string;
  practice?: string[];
}

export interface PinyinDiagnosis {
  targetText?: string;
  heardText?: string;
  targetPinyin?: string[];
  heardPinyin?: string[];
  issues: PinyinDiagnosisIssue[];
  summary: string;
}

export interface PronunciationAnalysis {
  heardText: string;
  summary: string;
  scores: ScoreSet;
  syllables: SyllableFeedback[];
  pinyinDiagnosis?: PinyinDiagnosis | null;
  raw?: unknown;
}

export interface AnalysisInput {
  targetText: string;
  audio: Blob;
  filename?: string;
  authorization?: string;
}

function score(value: unknown): number {
  // The Python service can emit missing or out-of-range values; the UI expects a 0-100 score.
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function rhythmScoreFromResult(result: Record<string, any>): number {
  const confidence = result?.tone_timing?.boundary_confidence;
  if (confidence === "low") return 62;
  if (confidence === "medium") return 78;
  if (confidence === "high") return 88;
  return 0;
}

function normalizeSyllables(result: Record<string, any>): SyllableFeedback[] {
  const rows = Array.isArray(result?.tone_timing?.syllables)
    ? result.tone_timing.syllables
    : [];

  return rows.map((item: Record<string, any>, index: number) => ({
    id: String(item.index ?? item.char ?? index),
    character: String(item.char || ""),
    pinyin: String(item.pinyin_display || item.pinyin || ""),
    score: score(item.tone_score),
    focus: item.tone ? `T${item.tone}` : "Pronunciation",
    feedback: String(item.feedback || "Practice this syllable slowly, then connect it back into the full sentence."),
  }));
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function normalizePinyinDiagnosis(result: Record<string, any>): PinyinDiagnosis | null {
  const diagnosis = result?.pinyin_diagnosis;
  if (!diagnosis || typeof diagnosis !== "object") return null;
  const source = diagnosis as Record<string, any>;
  return {
    targetText: source.target_text ? String(source.target_text) : undefined,
    heardText: source.heard_text ? String(source.heard_text) : undefined,
    targetPinyin: stringList(source.target_pinyin),
    heardPinyin: stringList(source.heard_pinyin),
    issues: Array.isArray(source.issues)
      ? source.issues.map((issue: Record<string, any>) => ({
          index: Number.isFinite(Number(issue.index)) ? Number(issue.index) : undefined,
          type: issue.type ? String(issue.type) : undefined,
          title: issue.title ? String(issue.title) : undefined,
          summary: issue.summary ? String(issue.summary) : undefined,
          focus: issue.focus ? String(issue.focus) : undefined,
          detail: issue.detail ? String(issue.detail) : undefined,
          practice: stringList(issue.practice),
        }))
      : [],
    summary: String(source.summary || ""),
  };
}

export function normalizePronunciationAnalysis(payload: unknown): PronunciationAnalysis {
  // Translate the Python/FunASR response into the stable contract consumed by the Next.js UI.
  const result = payload && typeof payload === "object" ? payload as Record<string, any> : {};
  const scores = {
    overall: score(result?.communication_result?.readiness_score),
    tone: score(result?.tone_timing?.overall_score),
    clarity: score(result?.asr?.text_similarity),
    rhythm: rhythmScoreFromResult(result),
  };

  return {
    heardText: String(result?.asr?.heard_text || result?.heardText || "The system did not hear clearly"),
    summary: String(
      result?.communication_result?.main_feedback
        || result?.pinyin_diagnosis?.summary
        || "Analysis completed. Review the syllable feedback and record again.",
    ),
    scores,
    syllables: normalizeSyllables(result),
    pinyinDiagnosis: normalizePinyinDiagnosis(result),
    raw: payload,
  };
}

export async function analyzeWithPronunciationService(input: AnalysisInput): Promise<PronunciationAnalysis> {
  if (!config.pronunciationApiUrl) {
    throw new Error("Pronunciation API is not configured yet. Set PRONUNCIATION_API_URL when it is available.");
  }

  // Rebuild the browser upload as multipart form data for the Python analysis service boundary.
  const form = new FormData();
  form.append("text", input.targetText);
  form.append("audio", input.audio, input.filename || "practice.webm");

  const headers = new Headers();
  if (input.authorization) headers.set("Authorization", input.authorization);

  const upstream = await fetch(`${config.pronunciationApiUrl}/api/analyze`, {
    method: "POST",
    headers,
    body: form,
  });
  const payload = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : "Pronunciation analysis failed.",
    );
  }

  return normalizePronunciationAnalysis(payload);
}
