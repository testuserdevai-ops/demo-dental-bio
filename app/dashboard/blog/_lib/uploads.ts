"use client";
import { actionError, type ActionResult } from "@/lib/forms/action-result";
import { createClient } from "@/utils/supabase/client";

const bucket = "blog-images";
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
export const BLOG_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export async function uploadBlogImage(
  userId: string,
  file: File,
): Promise<ActionResult<{ objectPath: string; publicUrl: string }>> {
  if (!allowed.has(file.type) || file.size > BLOG_IMAGE_MAX_BYTES)
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
  const objectPath = `${userId}/blogs/${crypto.randomUUID()}.${extension}`;
  const client = createClient();
  const { error } = await client.storage
    .from(bucket)
    .upload(objectPath, file, { upsert: false, contentType: file.type });
  if (error)
    return actionError("UPLOAD_FAILED", "Blog image could not be uploaded");
  return {
    ok: true,
    data: {
      objectPath,
      publicUrl: client.storage.from(bucket).getPublicUrl(objectPath).data
        .publicUrl,
    },
  };
}
export function blogImagePath(
  publicUrl: string,
  userId: string,
): string | null {
  try {
    const marker = `/object/public/${bucket}/`;
    const pathname = new URL(publicUrl).pathname;
    const index = pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(pathname.slice(index + marker.length));
    return path.startsWith(`${userId}/blogs/`) ? path : null;
  } catch {
    return null;
  }
}
export async function removeBlogImages(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const userId = paths[0]?.split("/")[0];
  const client = createClient();
  const { error } = await client.storage.from(bucket).remove(paths);
  if (!userId) return;
  if (error) {
    await Promise.all(
      paths.map((objectPath) =>
        client.rpc("enqueue_dashboard_media_cleanup", {
          p_user_id: userId,
          p_bucket: bucket,
          p_object_path: objectPath,
        }),
      ),
    );
    return;
  }
  await retryBlogImageCleanup(userId);
}
export async function retryBlogImageCleanup(userId: string): Promise<void> {
  const client = createClient();
  const { data, error } = await client.rpc("claim_dashboard_media_cleanup", {
    p_user_id: userId,
    p_bucket: bucket,
  });
  if (error || !data?.length) return;
  const jobs = data.filter((job) => job.bucket === bucket);
  if (!jobs.length) return;
  const removed = await client.storage
    .from(bucket)
    .remove(jobs.map((job) => job.object_path));
  if (removed.error) return;
  await client.rpc("complete_dashboard_media_cleanup", {
    p_user_id: userId,
    p_job_ids: jobs.map((job) => job.job_id),
  });
}
