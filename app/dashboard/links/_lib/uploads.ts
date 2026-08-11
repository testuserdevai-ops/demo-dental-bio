"use client";

import { actionError, type ActionResult } from "@/lib/forms/action-result";
import { createClient } from "@/utils/supabase/client";

const bucket = "link-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const LINK_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
export const LINK_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function validateLinkImage(file: File): string | null {
  if (!allowedTypes.has(file.type)) return "Choose a JPEG, PNG, or WebP image";
  if (file.size > LINK_IMAGE_MAX_BYTES)
    return "Choose an image no larger than 6 MB";
  return null;
}

export async function uploadLinkImage(
  userId: string,
  file: File,
): Promise<ActionResult<{ objectPath: string; publicUrl: string }>> {
  const validationError = validateLinkImage(file);
  if (validationError) return actionError("INVALID_FILE", validationError);
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const objectPath = `${userId}/links/${crypto.randomUUID()}.${extension}`;
  const client = createClient();
  const { error } = await client.storage.from(bucket).upload(objectPath, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error)
    return actionError("UPLOAD_FAILED", "Link image could not be uploaded");
  return {
    ok: true,
    data: {
      objectPath,
      publicUrl: client.storage.from(bucket).getPublicUrl(objectPath).data
        .publicUrl,
    },
  };
}

export function linkImagePath(
  publicUrl: string,
  userId: string,
): string | null {
  try {
    const marker = `/object/public/${bucket}/`;
    const pathname = new URL(publicUrl).pathname;
    const index = pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(pathname.slice(index + marker.length));
    return path.startsWith(`${userId}/links/`) && !path.includes("..")
      ? path
      : null;
  } catch {
    return null;
  }
}

export async function removeLinkImages(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const userId = paths[0]?.split("/")[0];
  if (!userId) return;
  const client = createClient();
  const { error } = await client.storage.from(bucket).remove(paths);
  if (!error) {
    await retryLinkImageCleanup(userId);
    return;
  }
  await Promise.all(
    paths.map((objectPath) =>
      client.rpc("enqueue_dashboard_media_cleanup", {
        p_user_id: userId,
        p_bucket: bucket,
        p_object_path: objectPath,
      }),
    ),
  );
}

export async function retryLinkImageCleanup(userId: string): Promise<void> {
  const client = createClient();
  const { data: jobs, error } = await client.rpc(
    "claim_dashboard_media_cleanup",
    { p_user_id: userId, p_bucket: bucket },
  );
  if (error || !jobs?.length) return;
  const linkJobs = jobs.filter((job) => job.bucket === bucket);
  if (!linkJobs.length) return;
  const { error: removeError } = await client.storage
    .from(bucket)
    .remove(linkJobs.map((job) => job.object_path));
  if (removeError) return;
  await client.rpc("complete_dashboard_media_cleanup", {
    p_user_id: userId,
    p_job_ids: linkJobs.map((job) => job.job_id),
  });
}
