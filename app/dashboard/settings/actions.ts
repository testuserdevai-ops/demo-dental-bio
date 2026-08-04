"use server";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import { invalidatePublicProfileCache } from "@/lib/public-profile/cache-invalidation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { registerUsernameSchema } from "@/lib/validation";
import { dashboardSettingsSchema } from "./_lib/schemas";

export async function saveDashboardSettings(
  targetHint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = dashboardSettingsSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);

  try {
    const { scope } = await resolveDashboardIdentity(targetHint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data: current, error: currentError } = await client
      .from("users")
      .select("username")
      .eq("id", scope.effectiveUserId)
      .single();
    if (currentError || !current)
      return actionError("LOAD_FAILED", "Settings could not be saved");
    if (value.username !== current.username) {
      const username = registerUsernameSchema.safeParse({
        username: value.username,
      });
      if (!username.success)
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          fieldErrors: {
            username: username.error.issues.map((issue) => issue.message),
          },
        };
    }
    const { data: conflict, error: conflictError } = await client
      .from("users")
      .select("id")
      .eq("username", value.username)
      .neq("id", scope.effectiveUserId)
      .maybeSingle();
    if (conflictError)
      return actionError(
        "USERNAME_CHECK_FAILED",
        "Settings could not be saved",
      );
    if (conflict)
      return {
        ok: false,
        code: "USERNAME_TAKEN",
        fieldErrors: { username: ["This username is already taken."] },
      };

    const { error } = await client
      .from("users")
      .update({
        first_name: value.first_name,
        middle_name: value.middle_name,
        last_name: value.last_name,
        title: value.title,
        birthday: value.birthday || null,
        username: value.username,
      })
      .eq("id", scope.effectiveUserId);
    if (error) return actionError("SAVE_FAILED", "Settings could not be saved");

    invalidatePublicProfileCache({
      profileId: scope.effectiveUserId,
      feature: "profile",
    });
    return { ok: true, data: undefined };
  } catch {
    return actionError("AUTHORIZATION_ERROR", "Settings could not be saved");
  }
}
