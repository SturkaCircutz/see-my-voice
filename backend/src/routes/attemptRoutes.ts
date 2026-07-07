import { Router } from "express";
import { ObjectId } from "mongodb";
import { analyzeWithPronunciationService } from "../analysis.js";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";
import {
  practiceAttemptsCollection,
  type PracticeAttemptDocument,
} from "../db.js";
import { saveAttemptAudio } from "../storage.js";

export const attemptRoutes = Router();

function toAttemptResponse(attempt: PracticeAttemptDocument) {
  // Serialize MongoDB attempt records into the API shape stored and rendered by the frontend.
  return {
    id: attempt._id.toHexString(),
    targetText: attempt.targetText,
    status: attempt.status,
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
    audio: attempt.audio,
    analysis: attempt.analysis,
    error: attempt.error,
  };
}

function attemptFilter(request: AuthenticatedRequest, attemptId: string) {
  if (!ObjectId.isValid(attemptId)) return null;
  // Scope lookups to the authenticated user so attempt ids cannot be used across accounts.
  return {
    _id: new ObjectId(attemptId),
    userId: request.user!._id,
  };
}

async function readAnalyzeForm(request: AuthenticatedRequest) {
  // Express exposes the upload stream, while Node's FormData parser expects a Web Request.
  const webRequest = new Request("http://local.invalid", {
    method: "POST",
    headers: {
      "content-type": request.header("Content-Type") || "application/octet-stream",
    },
    body: request as unknown as BodyInit,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  const form = await webRequest.formData();
  const audio = form.get("audio");

  if (!(audio instanceof Blob)) {
    throw new Error("No recording file was received.");
  }

  return {
    audio,
    filename: "name" in audio && typeof audio.name === "string" ? audio.name : "practice.webm",
  };
}

attemptRoutes.use(requireAuth);

attemptRoutes.get("/", async (request: AuthenticatedRequest, response) => {
  // Return recent attempts for the current user only.
  const attempts = await practiceAttemptsCollection()
    .find({ userId: request.user!._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  response.json({ attempts: attempts.map(toAttemptResponse) });
});

attemptRoutes.post("/", async (request: AuthenticatedRequest, response) => {
  // Create the attempt before audio upload so later analysis can attach to it.
  const targetText = String(request.body.targetText || "").trim();

  if (!targetText) {
    response.status(400).json({ error: "Target text is required." });
    return;
  }

  const now = new Date();
  const attempt: PracticeAttemptDocument = {
    _id: new ObjectId(),
    userId: request.user!._id,
    targetText,
    status: "created",
    createdAt: now,
    updatedAt: now,
  };

  await practiceAttemptsCollection().insertOne(attempt);
  response.status(201).json({ attempt: toAttemptResponse(attempt) });
});

attemptRoutes.get("/:attemptId", async (request: AuthenticatedRequest, response) => {
  // Fetch one owned attempt by id.
  const filter = attemptFilter(request, request.params.attemptId);
  if (!filter) {
    response.status(404).json({ error: "Attempt not found." });
    return;
  }

  const attempt = await practiceAttemptsCollection().findOne(filter);
  if (!attempt) {
    response.status(404).json({ error: "Attempt not found." });
    return;
  }

  response.json({ attempt: toAttemptResponse(attempt) });
});

attemptRoutes.post("/:attemptId/analyze", async (request: AuthenticatedRequest, response) => {
  // Save audio first, then send it to the pronunciation analysis service.
  const filter = attemptFilter(request, request.params.attemptId);
  if (!filter) {
    response.status(404).json({ error: "Attempt not found." });
    return;
  }

  const attempt = await practiceAttemptsCollection().findOne(filter);
  if (!attempt) {
    response.status(404).json({ error: "Attempt not found." });
    return;
  }

  const { audio, filename } = await readAnalyzeForm(request);
  const storageKey = await saveAttemptAudio({
    attemptId: attempt._id,
    userId: request.user!._id,
    audio,
    filename,
  });

  await practiceAttemptsCollection().updateOne(filter, {
    $set: {
      status: "analyzing",
      updatedAt: new Date(),
      audio: {
        storageKey,
        mimeType: audio.type || request.header("Content-Type") || "",
      },
    },
    $unset: { error: "" },
  });

  try {
    const analysis = await analyzeWithPronunciationService({
      targetText: attempt.targetText,
      audio,
      filename,
      authorization: request.header("Authorization") || "",
    });
    const updatedAt = new Date();

    await practiceAttemptsCollection().updateOne(filter, {
      $set: {
        status: "complete",
        updatedAt,
        analysis,
        analysisContentType: "application/json",
      },
      $unset: { error: "" },
    });

    response.json({
      attempt: toAttemptResponse({
        ...attempt,
        status: "complete",
        updatedAt,
        audio: {
          storageKey,
          mimeType: audio.type || "",
        },
        analysis,
      }),
      analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pronunciation analysis failed.";
    const updatedAt = new Date();

    await practiceAttemptsCollection().updateOne(filter, {
      $set: {
        status: "failed",
        updatedAt,
        error: message,
      },
    });

    response.status(502).json({ error: message });
  }
});
