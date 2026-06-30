import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, extname, join } from "node:path";
import { ObjectId } from "mongodb";

const backendRoot = fileURLToPath(new URL("..", import.meta.url));
const audioRoot = join(backendRoot, ".uploads", "attempt-audio");

function extensionFromFilename(filename: string): string {
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
  await mkdir(audioRoot, { recursive: true });
  const extension = extensionFromFilename(input.filename || "practice.webm");
  // Use Mongo ids in the storage key so database attempts can be joined back to local audio files.
  const storageKey = `${input.userId.toHexString()}-${input.attemptId.toHexString()}${extension}`;
  const bytes = Buffer.from(await input.audio.arrayBuffer());
  await writeFile(join(audioRoot, storageKey), bytes);
  return storageKey;
}
