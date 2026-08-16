"use client";

import { actionError, type ActionResult } from "@/lib/forms/action-result";
import { createClient } from "@/utils/supabase/client";

const bucket = "location-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LOCATION_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const LOCATION_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export type LocationImageScope = {
  userId: string;
  dentistryId: string;
  locationId: string;
};

export function validateLocationImage(file: File): string | null {
  if (!allowedTypes.has(file.type)) return "Choose a JPEG, PNG, or WebP image";
  if (file.size > LOCATION_IMAGE_MAX_BYTES)
    return "Choose an image no larger than 8 MB";
  return null;
}

function extensionFor(file: File): "jpg" | "png" | "webp" {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function createLocationImagePath(
  scope: LocationImageScope,
  objectId = crypto.randomUUID(),
  extension: "jpg" | "png" | "webp" = "webp",
) {
  if (
    !uuidPattern.test(scope.userId) ||
    !uuidPattern.test(scope.dentistryId) ||
    !uuidPattern.test(scope.locationId) ||
    !uuidPattern.test(objectId)
  ) {
    throw new TypeError("Location image scope is invalid");
  }
  return `${scope.userId}/dentistries/${scope.dentistryId}/locations/${scope.locationId}/${objectId}.${extension}`;
}

export async function uploadLocationImage(
  scope: LocationImageScope,
  file: File,
): Promise<ActionResult<{ objectPath: string; publicUrl: string }>> {
  const validationError = validateLocationImage(file);
  if (validationError) return actionError("INVALID_FILE", validationError);

  const objectPath = createLocationImagePath(
    scope,
    crypto.randomUUID(),
    extensionFor(file),
  );
  const client = createClient();
  const { error } = await client.storage.from(bucket).upload(objectPath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error)
    return actionError("UPLOAD_FAILED", "Location image could not be uploaded");

  return {
    ok: true,
    data: {
      objectPath,
      publicUrl: client.storage.from(bucket).getPublicUrl(objectPath).data
        .publicUrl,
    },
  };
}

export function locationImagePath(
  publicUrl: string,
  scope: LocationImageScope,
): string | null {
  if (
    !uuidPattern.test(scope.userId) ||
    !uuidPattern.test(scope.dentistryId) ||
    !uuidPattern.test(scope.locationId)
  )
    return null;
  try {
    const url = new URL(publicUrl);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    const marker = `/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    const prefix = `${scope.userId}/dentistries/${scope.dentistryId}/locations/${scope.locationId}/`;
    return path.startsWith(prefix) && !path.includes("..") ? path : null;
  } catch {
    return null;
  }
}

export async function removeLocationImages(paths: string[]): Promise<boolean> {
  if (!paths.length) return true;
  const userId = paths[0]?.split("/")[0];
  if (!userId) return false;
  let client: ReturnType<typeof createClient>;
  try {
    client = createClient();
    const { error } = await client.storage.from(bucket).remove(paths);
    if (!error) {
      await retryLocationImageCleanup(userId);
      return true;
    }
  } catch {
    try {
      client = createClient();
    } catch {
      return false;
    }
  }
  try {
    const enqueue = (objectPath: string) =>
      client.rpc("enqueue_dashboard_media_cleanup", {
        p_user_id: userId,
        p_bucket: bucket,
        p_object_path: objectPath,
      });
    const firstAttempt = await Promise.all(paths.map(enqueue));
    const failedPaths = paths.filter((_, index) => firstAttempt[index]?.error);
    if (!failedPaths.length) return true;
    const retry = await Promise.all(
      failedPaths.map((objectPath) => enqueue(objectPath)),
    );
    return retry.every(({ error }) => !error);
  } catch {
    // Failed-save cleanup is best effort and must not erase the mounted draft.
    return false;
  }
}

export async function retryLocationImageCleanup(userId: string): Promise<void> {
  try {
    const client = createClient();
    const { data: jobs, error } = await client.rpc(
      "claim_dashboard_media_cleanup",
      { p_user_id: userId, p_bucket: bucket },
    );
    if (error || !jobs?.length) return;
    const locationJobs = jobs.filter((job) => job.bucket === bucket);
    if (!locationJobs.length) return;
    const { error: removeError } = await client.storage
      .from(bucket)
      .remove(locationJobs.map((job) => job.object_path));
    if (removeError) return;
    await client.rpc("complete_dashboard_media_cleanup", {
      p_user_id: userId,
      p_job_ids: locationJobs.map((job) => job.job_id),
    });
  } catch {
    // A claimed job stays incomplete and can be retried later.
  }
}
