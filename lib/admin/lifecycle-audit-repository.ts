import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  filterLifecycleAuditEvents,
  type LifecycleAuditFilters,
  type LifecycleAuditModel,
} from "./lifecycle-audit";

export async function getAdminLifecycleAudit(
  filters: LifecycleAuditFilters & { ownerId: string },
): Promise<LifecycleAuditModel> {
  const client = await createServerSupabaseClient();
  const [auditResult, preferencesResult] = await Promise.all([
    client.rpc("get_lifecycle_audit", {
      p_target_user_id: filters.ownerId,
      p_limit: 100,
    }),
    client.rpc("get_lifecycle_preferences", {
      p_target_user_id: filters.ownerId,
    }),
  ]);
  const preferences = preferencesResult.data?.[0];
  if (auditResult.error || preferencesResult.error || !preferences) {
    throw new Error("Unable to load lifecycle operator audit");
  }

  return {
    ownerId: filters.ownerId,
    preferences: {
      lifecycleEmailsEnabled: preferences.lifecycle_emails_enabled,
      weeklySummaryEnabled: preferences.weekly_summary_enabled,
      milestoneEmailsEnabled: preferences.milestone_emails_enabled,
      promotionalUnsubscribedAt: preferences.promotional_unsubscribed_at,
      permanentDeliveryFailureAt: preferences.permanent_delivery_failure_at,
      supportPausedUntil: preferences.support_paused_until,
      revision: Number(preferences.revision),
      updatedAt: preferences.updated_at,
    },
    events: filterLifecycleAuditEvents(auditResult.data ?? [], filters),
    fetchedEventCount: auditResult.data?.length ?? 0,
    filters,
  };
}
