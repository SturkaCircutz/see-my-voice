import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { ObjectId } from "mongodb";

const audioRoot = process.env.VERCEL
  ? join(tmpdir(), "see-my-voice", "attempt-audio")
  : join(process.cwd(), ".uploads", "attempt-audio");

function extensionFromFilename(filename: string): string {
  // Keep the original extension when it looks safe, otherwise default to webm.
  const extension = extname(basename(filename)).toLowerCase();
  if (!extension || extension.length > 12) return ".webm";
  return extension;
}

export async function saveAttemptAudio(input: {
  attemptId: ObjectId;
  userId: ObjectId;
  audio: Blob;
  filename?: string;
}): Promise<string> {
  // Store uploaded practice audio beside the app or in tmp for serverless runs.
  await mkdir(audioRoot, { recursive: true });
  const extension = extensionFromFilename(input.filename || "practice.webm");
  // Use Mongo ids in the storage key so database attempts can be joined back to local audio files.
  const storageKey = `${input.userId.toHexString()}-${input.attemptId.toHexString()}${extension}`;
  const bytes = Buffer.from(await input.audio.arrayBuffer());
  await writeFile(join(audioRoot, storageKey), bytes);
  return storageKey;
}
