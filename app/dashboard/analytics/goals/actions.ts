"use server";

import { revalidatePath } from "next/cache";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  saveConversionGoalSchema,
  type SaveConversionGoalInput,
} from "./_lib/schemas";

export async function saveConversionGoal(
  targetHint: string | undefined,
  input: unknown,
): Promise<ActionResult<{ goalId: string }>> {
  const parsed = saveConversionGoalSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(targetHint);
    const client = await createServerSupabaseClient();
    const value: SaveConversionGoalInput = parsed.data;
    const { data, error } = await client.rpc("upsert_owner_conversion_goal", {
      p_profile_id: scope.effectiveUserId,
      p_goal_id: value.goalId!,
      p_name: value.name,
      p_event_type: value.eventType,
      p_entity_uuid: value.entityUuid!,
      p_entity_bigint: value.entityBigint!,
      p_is_primary: value.isPrimary,
      p_attribution_window_days: value.attributionWindowDays,
      p_enabled: value.enabled,
      p_value_minor: value.valueMinor!,
      p_currency: value.currency!,
    });
    if (error || !data?.[0]?.goal_id) {
      return actionError("SAVE_FAILED", "Unable to save conversion goal");
    }
    revalidatePath("/dashboard/analytics");
    revalidatePath("/dashboard/analytics/goals");
    return { ok: true, data: { goalId: data[0].goal_id } };
  } catch {
    return actionError("AUTHORIZATION_ERROR", "Unable to save conversion goal");
  }
}
