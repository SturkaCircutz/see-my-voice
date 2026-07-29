

function required(name: string, fallback = ""): string {
  // Use local defaults in development but still fail when a required value is blank.
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

// Centralized config keeps routes from reading process.env directly.
export const config = {
  port: Number(process.env.PORT || 8080),
  mongoUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017"),
  mongoDbName: required("MONGODB_DB", "see_my_voice"),
  frontendOrigins: (process.env.FRONTEND_ORIGIN || "http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  authSessionCookieName: process.env.AUTH_SESSION_COOKIE_NAME || "smv_session",
  authSessionTtlSeconds: Number(process.env.AUTH_SESSION_TTL_SECONDS || 60 * 60 * 24 * 7),
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "",
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "",
  pronunciationApiUrl: process.env.PRONUNCIATION_API_URL || "",
  hfInferenceToken: process.env.HF_INFERENCE_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN || "",
  hfInferenceApiBase: process.env.HF_INFERENCE_API_BASE || "https://router.huggingface.co/hf-inference/models",
  hfAsrModelId: "openai/whisper-large-v3",
  seedUsername: process.env.SEED_USERNAME || "",
  seedPassword: process.env.SEED_PASSWORD || "",
  seedName: process.env.SEED_NAME || "",
};
