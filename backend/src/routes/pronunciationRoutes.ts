import { Router } from "express";
import { requireAuth } from "../auth.js";
import { config } from "../config.js";

export const pronunciationRoutes = Router();

pronunciationRoutes.post("/analyze", requireAuth, async (request, response) => {
  if (!config.pronunciationApiUrl) {
    response.status(501).json({
      error:
        "Pronunciation API is not configured yet. Set PRONUNCIATION_API_URL when it is available.",
    });
    return;
  }

  const upstream = await fetch(`${config.pronunciationApiUrl}/analyze`, {
    method: "POST",
    headers: {
      authorization: request.header("Authorization") || "",
      "content-type": request.header("Content-Type") || "application/octet-stream",
    },
    body: request as unknown as BodyInit,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const text = await upstream.text();
  response.status(upstream.status);
  response.type(upstream.headers.get("content-type") || "application/json");
  response.send(text);
});
