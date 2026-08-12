import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AnalyticsDateRange = {
  startDate: string;
  endDate: string;
};

export type OwnerAnalyticsSummaryRow = {
  eventDate: string;
  profileViews: number;
  uniqueProfileVisitors: number | null;
  outboundActions: number;
  uniqueActionVisitors: number | null;
  conversions: number | null;
  uniqueConvertingVisitors: number | null;
};

export type OwnerAnalyticsTotals = Omit<OwnerAnalyticsSummaryRow, "eventDate">;

export type OwnerAnalyticsContentRow = {
  actionType: string;
  section: string;
  entityUuid: string | null;
  entityBigint: number | null;
  groupUuid: string | null;
  groupBigint: number | null;
  actionDimension: string | null;
  visiblePosition: number | null;
  totalEvents: number;
  uniqueVisitors: number | null;
  lastActiveAt: string;
};

export type AdminAnalyticsOverviewRow = {
  eventDate: string;
  profileViews: number;
  outboundActions: number;
  uniqueVisitors: number | null;
  activeProfiles: number;
};

export type AdminAnalyticsFilters = {
  plan?: "FREE" | "PRO" | "PREMIUM PRO";
  registeredDomain?: string;
};

export async function readOwnerAnalyticsSummary(
  profileId: string,
  range: AnalyticsDateRange,
): Promise<OwnerAnalyticsSummaryRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_owner_analytics_summary", {
    p_profile_id: profileId,
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });
  if (error) throw new Error("Unable to load analytics summary");
  return (data ?? []).map((row) => ({
    eventDate: row.event_date,
    profileViews: Number(row.profile_views),
    uniqueProfileVisitors:
      row.unique_profile_visitors === null
        ? null
        : Number(row.unique_profile_visitors),
    outboundActions: Number(row.outbound_actions),
    uniqueActionVisitors:
      row.unique_action_visitors === null
        ? null
        : Number(row.unique_action_visitors),
    conversions: row.conversions === null ? null : Number(row.conversions),
    uniqueConvertingVisitors:
      row.unique_converting_visitors === null
        ? null
        : Number(row.unique_converting_visitors),
  }));
}

export async function readOwnerAnalyticsTotals(
  profileId: string,
  range: AnalyticsDateRange,
): Promise<OwnerAnalyticsTotals> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_owner_analytics_totals", {
    p_profile_id: profileId,
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });
  if (error || !data?.[0]) throw new Error("Unable to load analytics totals");
  const row = data[0];
  return {
    profileViews: Number(row.profile_views),
    uniqueProfileVisitors:
      row.unique_profile_visitors === null
        ? null
        : Number(row.unique_profile_visitors),
    outboundActions: Number(row.outbound_actions),
    uniqueActionVisitors:
      row.unique_action_visitors === null
        ? null
        : Number(row.unique_action_visitors),
    conversions: row.conversions === null ? null : Number(row.conversions),
    uniqueConvertingVisitors:
      row.unique_converting_visitors === null
        ? null
        : Number(row.unique_converting_visitors),
  };
}

export async function readOwnerAnalyticsContent(
  profileId: string,
  range: AnalyticsDateRange,
): Promise<OwnerAnalyticsContentRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_owner_analytics_content", {
    p_profile_id: profileId,
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });
  if (error) throw new Error("Unable to load analytics content");
  return (data ?? []).map((row) => ({
    actionType: row.action_type,
    section: row.section,
    entityUuid: row.entity_uuid,
    entityBigint: row.entity_bigint === null ? null : Number(row.entity_bigint),
    groupUuid: row.group_uuid,
    groupBigint: row.group_bigint === null ? null : Number(row.group_bigint),
    actionDimension: row.action_dimension,
    visiblePosition:
      row.visible_position === null ? null : Number(row.visible_position),
    totalEvents: Number(row.total_events),
    uniqueVisitors:
      row.unique_visitors === null ? null : Number(row.unique_visitors),
    lastActiveAt: row.last_active_at!,
  }));
}

export async function readAdminAnalyticsOverview(
  range: AnalyticsDateRange,
  filters: AdminAnalyticsFilters = {},
): Promise<AdminAnalyticsOverviewRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_analytics_overview", {
    p_start_date: range.startDate,
    p_end_date: range.endDate,
    p_plan: filters.plan ?? null,
    p_registered_domain: filters.registeredDomain ?? null,
  } as never);
  if (error) throw new Error("Unable to load admin analytics overview");
  return (data ?? []).map((row) => ({
    eventDate: row.event_date,
    profileViews: Number(row.profile_views),
    outboundActions: Number(row.outbound_actions),
    uniqueVisitors:
      row.unique_visitors === null ? null : Number(row.unique_visitors),
    activeProfiles: Number(row.active_profiles),
  }));
}
