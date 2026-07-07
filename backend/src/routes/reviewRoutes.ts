import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";
import { reviewsCollection, taskSubmissionsCollection } from "../db.js";

export const reviewRoutes = Router();

function toReviewResponse(review: {
  _id: ObjectId;
  submissionId: ObjectId;
  teacherId: ObjectId;
  feedback: string;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  // Convert review references to strings for frontend consumption.
  return {
    id: review._id.toHexString(),
    submissionId: review.submissionId.toHexString(),
    teacherId: review.teacherId.toHexString(),
    feedback: review.feedback,
    score: review.score,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

reviewRoutes.use(requireAuth);

reviewRoutes.get("/", async (_request: AuthenticatedRequest, response) => {
  // Review center reads recent teacher feedback records.
  const reviews = await reviewsCollection()
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  response.json({ reviews: reviews.map(toReviewResponse) });
});

reviewRoutes.post("/", async (request: AuthenticatedRequest, response) => {
  // Saving a review also marks the related submission as reviewed.
  const submissionId = String(request.body.submissionId || "").trim();
  const feedback = String(request.body.feedback || "").trim();
  const score = request.body.score === undefined ? undefined : Number(request.body.score);

  if (!ObjectId.isValid(submissionId) || !feedback) {
    response.status(400).json({ error: "submissionId and feedback are required." });
    return;
  }
  if (score !== undefined && (!Number.isFinite(score) || score < 0 || score > 100)) {
    response.status(400).json({ error: "Score must be between 0 and 100." });
    return;
  }

  const now = new Date();
  const review = {
    _id: new ObjectId(),
    submissionId: new ObjectId(submissionId),
    teacherId: request.user!._id,
    feedback,
    score,
    createdAt: now,
    updatedAt: now,
  };

  await reviewsCollection().insertOne(review);
  await taskSubmissionsCollection().updateOne(
    { _id: review.submissionId },
    { $set: { status: "reviewed", updatedAt: now } },
  );

  response.status(201).json({ review: toReviewResponse(review) });
});
