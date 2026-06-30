import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { config } from "./config.js";
import { connectToMongo } from "./db.js";
import { attemptRoutes } from "./routes/attemptRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { chatRoutes } from "./routes/chatRoutes.js";
import { pronunciationRoutes } from "./routes/pronunciationRoutes.js";
import { reviewRoutes } from "./routes/reviewRoutes.js";
import { submissionRoutes } from "./routes/submissionRoutes.js";
import { taskRoutes } from "./routes/taskRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { seedConfiguredUser } from "./seed.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        config.frontendOrigins.includes(origin) ||
        /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_request, response) => {
  response.json({ ok: true, service: "see-my-voice-backend" });
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "see-my-voice-backend" });
});

app.use("/api/auth", async (_request, _response, next) => {
  try {
    await connectToMongo();
    await seedConfiguredUser();
    next();
  } catch (error) {
    next(error);
  }
});
app.use("/api/auth", authRoutes);

// These routes all require MongoDB before their handlers touch typed collections.
app.use(
  [
    "/api/users",
    "/api/attempts",
    "/api/tasks",
    "/api/submissions",
    "/api/reviews",
    "/api/chat",
  ],
  async (_request, _response, next) => {
    try {
      await connectToMongo();
      next();
    } catch (error) {
      next(error);
    }
  },
);
app.use("/api/users", userRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);

app.use("/api/pronunciation", async (_request, _response, next) => {
  try {
    await connectToMongo();
    next();
  } catch (error) {
    next(error);
  }
});
app.use("/api/pronunciation", pronunciationRoutes);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error." });
};

app.use(errorHandler);

if (!process.env.VERCEL) {
  await connectToMongo();
  await seedConfiguredUser();

  app.listen(config.port, () => {
    console.log(`See My Voice backend running on http://127.0.0.1:${config.port}`);
  });
}

export default app;
