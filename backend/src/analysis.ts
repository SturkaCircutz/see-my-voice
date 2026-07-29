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

interface HostedAsrResult {
  text: string;
  raw: unknown;
  unavailableReason?: string;
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

function normalizeComparableText(text: string): string {
  return (text.match(/[\u4e00-\u9fffA-Za-z0-9]+/g) || []).join("").toLowerCase();
}

function editDistance(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const previous = Array.from({ length: cols }, (_, index) => index);

  for (let row = 1; row < rows; row += 1) {
    const current = [row];
    for (let col = 1; col < cols; col += 1) {
      const replaceCost = left[row - 1] === right[col - 1] ? 0 : 1;
      current[col] = Math.min(
        previous[col] + 1,
        current[col - 1] + 1,
        previous[col - 1] + replaceCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[cols - 1] || 0;
}

function textSimilarity(targetText: string, heardText: string): number {
  const target = normalizeComparableText(targetText);
  const heard = normalizeComparableText(heardText);
  const maxLength = Math.max(target.length, heard.length, 1);
  return Math.max(0, Math.min(100, Math.round((1 - editDistance(target, heard) / maxLength) * 1000) / 10));
}

function targetCharacters(targetText: string): string[] {
  return Array.from(targetText).filter((char) => /[\u4e00-\u9fff]/.test(char));
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

function hostedAsrEndpoint(): string {
  const baseUrl = config.hfInferenceApiBase.replace(/\/$/, "");
  const modelPath = config.hfAsrModelId.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl}/${modelPath}`;
}

function normalizeAudioContentType(contentType: string): string {
  const normalized = contentType.trim().toLowerCase();
  const baseType = normalized.split(";")[0]?.trim() || "";

  // iOS Safari commonly records AAC in an MP4 container. Hugging Face rejects
  // `audio/mp4; codecs=...` but accepts the same payload as m4a audio.
  if (baseType === "audio/mp4" || baseType === "audio/x-m4a") return "audio/m4a";
  if (baseType === "audio/webm") return "audio/webm";
  return normalized || "audio/webm";
}

function normalizeAudioFilename(filename: string | undefined, contentType: string): string {
  const rawName = filename || "practice.webm";
  if (contentType === "audio/m4a" && !/\.(m4a|mp4|aac)$/i.test(rawName)) {
    return rawName.replace(/\.[^.]+$/i, "") + ".m4a";
  }
  if (contentType === "audio/webm" && !/\.webm$/i.test(rawName)) {
    return rawName.replace(/\.[^.]+$/i, "") + ".webm";
  }
  return rawName;
}

async function normalizedAudioUpload(input: AnalysisInput): Promise<{ audio: Blob; contentType: string; filename: string }> {
  const contentType = normalizeAudioContentType(input.audio.type);
  const filename = normalizeAudioFilename(input.filename, contentType);
  if (contentType === input.audio.type) return { audio: input.audio, contentType, filename };
  return {
    audio: new Blob([await input.audio.arrayBuffer()], { type: contentType }),
    contentType,
    filename,
  };
}

function extractHostedAsrText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";
  const source = payload as Record<string, any>;
  if (typeof source.text === "string") return source.text;
  if (typeof source.generated_text === "string") return source.generated_text;
  if (Array.isArray(source.chunks)) {
    return source.chunks.map((chunk) => typeof chunk?.text === "string" ? chunk.text : "").join("");
  }
  return "";
}

function hostedAsrUnavailable(reason: string, raw: unknown): HostedAsrResult {
  return {
    text: "",
    raw,
    unavailableReason: reason,
  };
}

function hostedAsrErrorPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return {};
  const source = payload as Record<string, unknown>;
  return {
    error: source.error ? "Hosted ASR provider could not run the default model." : "Hosted ASR provider did not return a transcript.",
  };
}

async function analyzeWithHostedAsr(input: AnalysisInput): Promise<HostedAsrResult> {
  if (!config.hfInferenceToken) {
    throw new Error("Hosted ASR fallback is not configured. Set HF_INFERENCE_TOKEN or PRONUNCIATION_API_URL.");
  }
  const upload = await normalizedAudioUpload(input);
  const endpoint = hostedAsrEndpoint();

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.hfInferenceToken}`,
        "Content-Type": upload.contentType,
      },
      body: await upload.audio.arrayBuffer(),
    });
  } catch (error) {
    return hostedAsrUnavailable(
      "Default Hugging Face ASR network request failed.",
      {
        error: "Default Hugging Face ASR network request failed.",
        endpoint: "default-hosted-asr",
        detail: error instanceof Error ? error.name : "NetworkError",
      },
    );
  }
  const payload = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return hostedAsrUnavailable(
      "Default Hugging Face ASR is unavailable from the hosted provider.",
      {
        status: upstream.status,
        endpoint: "default-hosted-asr",
        response: hostedAsrErrorPayload(payload),
      },
    );
  }

  return {
    text: extractHostedAsrText(payload),
    raw: payload,
  };
}

function normalizeHostedAsrAnalysis(input: AnalysisInput, result: HostedAsrResult): PronunciationAnalysis {
  const similarity = textSimilarity(input.targetText, result.text);
  const targetChars = targetCharacters(input.targetText);
  const summary = result.unavailableReason
    ? "The default hosted ASR model could not be reached. The recording was received, but text recognition is temporarily unavailable."
    : similarity >= 80
    ? "The hosted ASR model heard text close to the target. Use the optional trained phone-token model for initial, final, and tone-level feedback."
    : "The hosted ASR model heard differences from the target. For sound-level feedback, deploy the trained See My Voice phone-token model service.";

  return {
    heardText: result.text || "The hosted ASR model did not hear clearly",
    summary,
    scores: {
      overall: similarity,
      tone: 0,
      clarity: similarity,
      rhythm: 0,
    },
    syllables: targetChars.map((character, index) => ({
      id: String(index),
      character,
      pinyin: "",
      score: similarity,
      focus: "ASR",
      feedback: "This free hosted mode checks recognized text only. Deploy the trained phone-token model for initial, final, and tone labels.",
    })),
    pinyinDiagnosis: {
      targetText: input.targetText,
      heardText: result.text,
      targetPinyin: [],
      heardPinyin: [],
      issues: similarity >= 95
        ? []
        : [
            {
              type: "hosted_asr",
              title: "Hosted ASR text differs from the target",
              summary,
              focus: "Whole sentence",
              detail: `Target: ${input.targetText}. Heard: ${result.text || "unclear"}.`,
              practice: [input.targetText],
            },
          ],
      summary,
    },
    phoneCtc: {
      enabled: false,
      modelDir: config.hfAsrModelId,
      device: "default-hosted-asr",
      targetText: input.targetText,
      expectedTokens: [],
      predictedTokens: [],
      expectedText: "",
      predictedText: result.text,
      summary: "The deployed site is using a hosted free ASR fallback. The See My Voice phone-token model is optional and must be deployed as a separate service.",
      error: result.unavailableReason || "Phone-token CTC model service is not connected.",
    },
    raw: {
      provider: "default-hosted-asr",
      model: config.hfAsrModelId,
      mode: "hosted_asr_fallback",
      response: result.raw,
    },
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
    if (config.hfInferenceToken) {
      try {
        return normalizeHostedAsrAnalysis(input, await analyzeWithHostedAsr(input));
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Hosted ASR analysis failed.");
      }
    }
    throw new Error(
      "Default Hugging Face pronunciation model is not configured. Set HF_INFERENCE_TOKEN for the default ASR model or PRONUNCIATION_API_URL for a separate pronunciation service.",
    );
  }

  // Rebuild the browser upload as multipart form data for the Python analysis service boundary.
  const upload = await normalizedAudioUpload(input);
  const form = new FormData();
  form.append("text", input.targetText);
  form.append("audio", upload.audio, upload.filename);

  const headers = new Headers();
  if (input.authorization) headers.set("Authorization", input.authorization);

  let upstream: Response;
  try {
    upstream = await fetch(`${config.pronunciationApiUrl}/api/analyze`, {
      method: "POST",
      headers,
      body: form,
    });
  } catch (error) {
    if (config.hfInferenceToken) {
      return normalizeHostedAsrAnalysis(input, await analyzeWithHostedAsr(input));
    }
    const message = error instanceof Error ? error.message : "network request failed";
    throw new Error(`Pronunciation API request failed at ${config.pronunciationApiUrl}: ${message}`);
  }
  const payload = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    if (config.hfInferenceToken) {
      return normalizeHostedAsrAnalysis(input, await analyzeWithHostedAsr(input));
    }
    throw new Error(
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : "Pronunciation analysis failed.",
    );
  }

  return normalizePronunciationAnalysis(payload);
}
