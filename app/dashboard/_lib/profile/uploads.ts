"use client";
import { createClient } from "@/utils/supabase/client";
import { actionError, type ActionResult } from "@/lib/forms/action-result";

const bucket = "profile-pics";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const PROFILE_PICTURE_MAX_BYTES = 5 * 1024 * 1024;

export function validateProfilePicture(file: File): string | null {
  if (!allowedTypes.has(file.type) || file.size > PROFILE_PICTURE_MAX_BYTES)
    return "Choose a JPEG, PNG, or WebP image no larger than 5 MB";
  return null;
}

export async function uploadProfilePicture(
  dentistryId: string,
  file: File,
): Promise<ActionResult<{ objectPath: string; publicUrl: string }>> {
  const validationError = validateProfilePicture(file);
  if (validationError) return actionError("INVALID_FILE", validationError);
  const client = createClient();
  const objectPath = `${dentistryId}/profile-pic-${crypto.randomUUID()}.webp`;
  const { error } = await client.storage.from(bucket).upload(objectPath, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error)
    return actionError(
      "UPLOAD_FAILED",
      "Profile picture could not be uploaded",
    );

  const { data: files } = await client.storage.from(bucket).list(dentistryId);
  const stale = (files ?? [])
    .filter((item) => `${dentistryId}/${item.name}` !== objectPath)
    .map((item) => `${dentistryId}/${item.name}`);
  if (stale.length) await client.storage.from(bucket).remove(stale);
  return {
    ok: true,
    data: {
      objectPath,
      publicUrl: client.storage.from(bucket).getPublicUrl(objectPath).data
        .publicUrl,
    },
  };
}

export async function deleteProfilePicture(
  dentistryId: string,
): Promise<ActionResult<void>> {
  const client = createClient();
  const { data, error } = await client.storage.from(bucket).list(dentistryId);
  if (error)
    return actionError("DELETE_FAILED", "Profile picture could not be deleted");
  const paths = (data ?? []).map((item) => `${dentistryId}/${item.name}`);
  if (paths.length) {
    const { error: removeError } = await client.storage
      .from(bucket)
      .remove(paths);
    if (removeError)
      return actionError(
        "DELETE_FAILED",
        "Profile picture could not be deleted",
      );
  }
  return { ok: true, data: undefined };
}
