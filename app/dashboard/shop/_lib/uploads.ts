"use client";
import { actionError, type ActionResult } from "@/lib/forms/action-result";
import { createClient } from "@/utils/supabase/client";
const bucket = "product-images";
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export async function uploadProductImage(
  userId: string,
  file: File,
): Promise<ActionResult<{ objectPath: string; publicUrl: string }>> {
  if (!allowed.has(file.type) || file.size > PRODUCT_IMAGE_MAX_BYTES)
    return actionError(
      "INVALID_FILE",
      "Choose a JPEG, PNG, or WebP image no larger than 8 MB",
    );
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const objectPath = `${userId}/products/${crypto.randomUUID()}.${ext}`;
  const client = createClient();
  const { error } = await client.storage
    .from(bucket)
    .upload(objectPath, file, { upsert: false, contentType: file.type });
  if (error)
    return actionError("UPLOAD_FAILED", "Product image could not be uploaded");
  return {
    ok: true,
    data: {
      objectPath,
      publicUrl: client.storage.from(bucket).getPublicUrl(objectPath).data
        .publicUrl,
    },
  };
}
export async function removeProductImages(paths: string[]) {
  if (!paths.length) return;
  const userId = paths[0]?.split("/")[0];
  const client = createClient();
  const { error } = await client.storage.from(bucket).remove(paths);
  if (!userId) return;
  if (!error) {
    await retryProductImageCleanup(userId);
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
export async function retryProductImageCleanup(userId: string) {
  const client = createClient();
  const { data, error } = await client.rpc("claim_dashboard_media_cleanup", {
    p_user_id: userId,
    p_bucket: bucket,
  });
  if (error || !data?.length) return;
  const jobs = data.filter((job) => job.bucket === bucket);
  if (!jobs.length) return;
  const { error: removeError } = await client.storage
    .from(bucket)
    .remove(jobs.map((job) => job.object_path));
  if (removeError) return;
  await client.rpc("complete_dashboard_media_cleanup", {
    p_user_id: userId,
    p_job_ids: jobs.map((job) => job.job_id),
  });
}
export function productImagePath(url: string, userId: string) {
  try {
    const marker = `/object/public/${bucket}/`;
    const path = decodeURIComponent(
      new URL(url).pathname.split(marker)[1] ?? "",
    );
    return path.startsWith(`${userId}/products/`) ? path : null;
  } catch {
    return null;
  }
}
