

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
  jwtSecret: required("JWT_SECRET", "dev-only-change-me"),
  frontendOrigins: (process.env.FRONTEND_ORIGIN || "http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  pronunciationApiUrl: process.env.PRONUNCIATION_API_URL || "",
  seedUsername: process.env.SEED_USERNAME || "",
  seedPassword: process.env.SEED_PASSWORD || "",
  seedName: process.env.SEED_NAME || "",
};
