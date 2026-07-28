import { Router } from "express";
import { analyzeWithPronunciationService } from "../analysis.js";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";

export const pronunciationRoutes = Router();

async function readAnalyzeForm(request: AuthenticatedRequest) {
  // Parse multipart uploads without adding a separate Express upload middleware.
  const webRequest = new Request("http://local.invalid", {
    method: "POST",
    headers: {
      "content-type": request.header("Content-Type") || "application/octet-stream",
    },
    body: request as unknown as BodyInit,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  const form = await webRequest.formData();
  const text = String(form.get("text") || "").trim();
  const audio = form.get("audio");

  if (!text) throw new Error("Target text is required.");
  if (!(audio instanceof Blob)) throw new Error("No recording file was received.");

  return {
    text,
    audio,
    filename: "name" in audio && typeof audio.name === "string" ? audio.name : "practice.webm",
  };
}

pronunciationRoutes.post("/analyze", requireAuth, async (request, response) => {
  // This endpoint can use the trained Python service, hosted ASR, or built-in default baseline.
  try {
    const { text, audio, filename } = await readAnalyzeForm(request);
    const analysis = await analyzeWithPronunciationService({
      targetText: text,
      audio,
      filename,
      authorization: request.header("Authorization") || "",
    });

    response.json(analysis);
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "Pronunciation analysis failed.",
    });
  }
});
