"use client";
import { actionError, type ActionResult } from "@/lib/forms/action-result";
import { createClient } from "@/utils/supabase/client";

const bucket = "gallery-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const GALLERY_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export async function uploadGalleryImage(
  userId: string,
  file: File,
): Promise<ActionResult<{ objectPath: string; publicUrl: string }>> {
  if (!allowedTypes.has(file.type) || file.size > GALLERY_IMAGE_MAX_BYTES)
    return actionError(
      "INVALID_FILE",
      "Choose a JPEG, PNG, or WebP image no larger than 8 MB",
    );
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const objectPath = `${userId}/gallery/${crypto.randomUUID()}.${extension}`;
  const client = createClient();
  const { error } = await client.storage.from(bucket).upload(objectPath, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error)
    return actionError("UPLOAD_FAILED", "Gallery image could not be uploaded");
  return {
    ok: true,
    data: {
      objectPath,
      publicUrl: client.storage.from(bucket).getPublicUrl(objectPath).data
        .publicUrl,
    },
  };
}

export async function removeGalleryImages(paths: string[]): Promise<void> {
  if (!paths.length) return;
  await createClient().storage.from(bucket).remove(paths);
}

export function galleryImagePath(
  publicUrl: string,
  userId: string,
): string | null {
  try {
    const marker = `/object/public/${bucket}/`;
    const pathname = new URL(publicUrl).pathname;
    const index = pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(pathname.slice(index + marker.length));
    return path.startsWith(`${userId}/gallery/`) ? path : null;
  } catch {
    return null;
  }
}
