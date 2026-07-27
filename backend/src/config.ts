

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
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL || "",
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  pronunciationApiUrl: process.env.PRONUNCIATION_API_URL || "",
  hfInferenceToken: process.env.HF_INFERENCE_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN || "",
  hfInferenceProvider: process.env.HF_INFERENCE_PROVIDER || "hf-inference",
  hfAsrModelId: process.env.HF_ASR_MODEL_ID || "openai/whisper-large-v3-turbo",
  seedUsername: process.env.SEED_USERNAME || "",
  seedPassword: process.env.SEED_PASSWORD || "",
  seedName: process.env.SEED_NAME || "",
};
