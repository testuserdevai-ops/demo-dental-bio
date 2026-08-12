import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { LifecyclePreferences } from "./contract";

export type LifecyclePreferenceState = LifecyclePreferences & {
  revision: number;
  updatedAt: string | null;
};

export async function getLifecyclePreferences(
  userId: string,
): Promise<LifecyclePreferenceState> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("get_lifecycle_preferences", {
    p_target_user_id: userId,
  });
  const row = data?.[0];
  if (error || !row) throw new Error("Unable to load lifecycle preferences");
  return {
    lifecycleEmailsEnabled: row.lifecycle_emails_enabled,
    weeklySummaryEnabled: row.weekly_summary_enabled,
    milestoneEmailsEnabled: row.milestone_emails_enabled,
    promotionalUnsubscribedAt: row.promotional_unsubscribed_at,
    permanentDeliveryFailureAt: row.permanent_delivery_failure_at,
    supportPausedUntil: row.support_paused_until,
    revision: Number(row.revision),
    updatedAt: row.updated_at,
  };
}

export async function saveLifecyclePreferences(input: {
  userId: string;
  expectedRevision: number;
  lifecycleEmailsEnabled: boolean;
  weeklySummaryEnabled: boolean;
  milestoneEmailsEnabled: boolean;
}): Promise<LifecyclePreferenceState> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("save_lifecycle_preferences", {
    p_target_user_id: input.userId,
    p_expected_revision: input.expectedRevision,
    p_lifecycle_emails_enabled: input.lifecycleEmailsEnabled,
    p_weekly_summary_enabled: input.weeklySummaryEnabled,
    p_milestone_emails_enabled: input.milestoneEmailsEnabled,
  });
  const row = data?.[0];
  if (error || !row) throw new Error("Unable to save lifecycle preferences");
  return {
    lifecycleEmailsEnabled: row.lifecycle_emails_enabled,
    weeklySummaryEnabled: row.weekly_summary_enabled,
    milestoneEmailsEnabled: row.milestone_emails_enabled,
    promotionalUnsubscribedAt: null,
    permanentDeliveryFailureAt: null,
    supportPausedUntil: null,
    revision: Number(row.revision),
    updatedAt: row.updated_at,
  };
}
