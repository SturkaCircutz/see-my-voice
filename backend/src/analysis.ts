import { config } from "./config.js";

export interface ScoreSet {
  // The frontend expects four headline scores in a consistent range.
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

export interface PhoneCtcAnalysis {
  enabled: boolean;
  modelDir?: string;
  device?: string;
  targetText?: string;
  expectedTokens: string[];
  predictedTokens: string[];
  expectedText: string;
  predictedText: string;
  editDistance?: number;
  tokenAccuracy?: number;
  exactMatch?: boolean;
  summary?: string;
  error?: string;
}

export interface PronunciationAnalysis {
  // This is the stable analysis shape returned by the backend API.
  heardText: string;
  summary: string;
  scores: ScoreSet;
  syllables: SyllableFeedback[];
  pinyinDiagnosis?: PinyinDiagnosis | null;
  phoneCtc?: PhoneCtcAnalysis | null;
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
  // Convert boundary confidence labels into a simple rhythm score.
  const confidence = result?.tone_timing?.boundary_confidence;
  if (confidence === "low") return 62;
  if (confidence === "medium") return 78;
  if (confidence === "high") return 88;
  return 0;
}

function normalizeSyllables(result: Record<string, any>): SyllableFeedback[] {
  // Each detected syllable becomes one row in the pronunciation detail UI.
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
  // Normalize optional arrays from the Python service.
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function optionalNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizePinyinDiagnosis(result: Record<string, any>): PinyinDiagnosis | null {
  // Pinyin diagnosis is optional because some analysis paths only return scores.
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

function normalizePhoneCtcAnalysis(result: Record<string, any>): PhoneCtcAnalysis | null {
  const analysis = result?.phone_ctc;
  if (!analysis || typeof analysis !== "object") return null;
  const source = analysis as Record<string, any>;
  return {
    enabled: source.enabled === true,
    modelDir: source.model_dir ? String(source.model_dir) : undefined,
    device: source.device ? String(source.device) : undefined,
    targetText: source.target_text ? String(source.target_text) : undefined,
    expectedTokens: stringList(source.expected_tokens),
    predictedTokens: stringList(source.predicted_tokens),
    expectedText: String(source.expected_text || ""),
    predictedText: String(source.predicted_text || ""),
    editDistance: optionalNumber(source.edit_distance),
    tokenAccuracy: optionalNumber(source.token_accuracy),
    exactMatch: typeof source.exact_match === "boolean" ? source.exact_match : undefined,
    summary: source.summary ? String(source.summary) : undefined,
    error: source.error ? String(source.error) : undefined,
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
    phoneCtc: normalizePhoneCtcAnalysis(result),
    raw: payload,
  };
}

export async function analyzeWithPronunciationService(input: AnalysisInput): Promise<PronunciationAnalysis> {
  // Backend routes call through this function instead of talking to Python directly.
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
