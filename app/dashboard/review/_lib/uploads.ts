"use client";
import { actionError, type ActionResult } from "@/lib/forms/action-result";
import { createClient } from "@/utils/supabase/client";

const bucket = "review-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const REVIEW_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export async function uploadReviewImage(
  userId: string,
  file: File,
): Promise<ActionResult<{ objectPath: string; publicUrl: string }>> {
  if (!allowedTypes.has(file.type) || file.size > REVIEW_IMAGE_MAX_BYTES)
    return actionError(
      "INVALID_FILE",
      "Choose a JPEG, PNG, or WebP image no larger than 5 MB",
    );
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const objectPath = `${userId}/review/${crypto.randomUUID()}.${extension}`;
  const client = createClient();
  const { error } = await client.storage.from(bucket).upload(objectPath, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error)
    return actionError("UPLOAD_FAILED", "Review image could not be uploaded");
  return {
    ok: true,
    data: {
      objectPath,
      publicUrl: client.storage.from(bucket).getPublicUrl(objectPath).data
        .publicUrl,
    },
  };
}

export async function removeReviewImages(paths: string[]): Promise<void> {
  if (!paths.length) return;
  await createClient().storage.from(bucket).remove(paths);
}

export function reviewImagePath(
  publicUrl: string,
  userId: string,
): string | null {
  try {
    const marker = `/object/public/${bucket}/`;
    const pathname = new URL(publicUrl).pathname;
    const index = pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(pathname.slice(index + marker.length));
    return path.startsWith(`${userId}/review/`) ? path : null;
  } catch {
    return null;
  }
}
