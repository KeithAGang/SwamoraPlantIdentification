/**
 * Local-disk image storage with deduplication by sha256.
 *
 * Layout under UPLOAD_ROOT:
 *   plants/<yyyy>/<mm>/<sha256>.<ext>
 *
 * A row is written to plant_images each time, but the on-disk file is reused
 * when the same content is uploaded again (cheap dedup, expensive privacy-safe).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { plantImages } from "../db/schema.js";

const DEFAULT_UPLOAD_ROOT = "/app/uploads";
export const UPLOAD_ROOT = process.env.UPLOAD_ROOT || DEFAULT_UPLOAD_ROOT;

const extensionFor = (contentType: string, fallback = "bin"): string => {
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("heic")) return "heic";
  return fallback;
};

export interface StoredImage {
  id: number;
  storedPath: string;
  sha256: string;
  contentType: string;
  sizeBytes: number;
}

export interface StoreImageInput {
  userId: number;
  buffer: Buffer;
  originalName: string | null;
  contentType: string;
}

export const storeImage = async ({
  userId,
  buffer,
  originalName,
  contentType,
}: StoreImageInput): Promise<StoredImage> => {
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  // Dedup: if the same user already has this exact image, reuse the row.
  const existing = await db
    .select()
    .from(plantImages)
    .where(eq(plantImages.sha256, sha256))
    .limit(1);
  if (existing[0] && existing[0].userId === userId) {
    return {
      id: existing[0].id,
      storedPath: existing[0].storedPath,
      sha256: existing[0].sha256,
      contentType: existing[0].contentType,
      sizeBytes: existing[0].sizeBytes,
    };
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = extensionFor(contentType);
  const relativePath = path.posix.join("plants", yyyy, mm, `${sha256}.${ext}`);
  const absolutePath = path.join(UPLOAD_ROOT, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  // If the same content already lives on disk under a different user, reuse it.
  try {
    await fs.access(absolutePath);
  } catch {
    await fs.writeFile(absolutePath, buffer);
  }

  const inserted = await db
    .insert(plantImages)
    .values({
      userId,
      storedPath: relativePath,
      originalName,
      contentType,
      sizeBytes: buffer.length,
      sha256,
    })
    .returning();

  const row = inserted[0];
  return {
    id: row.id,
    storedPath: row.storedPath,
    sha256: row.sha256,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
  };
};
