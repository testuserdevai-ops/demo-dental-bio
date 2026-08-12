"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const timezoneSchema = z.string().trim().min(1).max(64);

export type AnalyticsTimezoneResult =
  { ok: true; timezone: string } | { ok: false; message: string };

export async function saveAnalyticsTimezone(
  targetHint: string | undefined,
  timezone: string,
): Promise<AnalyticsTimezoneResult> {
  const parsed = timezoneSchema.safeParse(timezone);
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid reporting timezone." };
  }

  try {
    const { scope } = await resolveDashboardIdentity(targetHint);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("set_owner_analytics_timezone", {
      p_profile_id: scope.effectiveUserId,
      p_timezone: parsed.data,
    });
    if (error || data !== parsed.data) {
      return { ok: false, message: "Unable to save reporting timezone." };
    }
    revalidatePath("/dashboard/analytics");
    return { ok: true, timezone: data };
  } catch {
    return { ok: false, message: "Unable to save reporting timezone." };
  }
}
