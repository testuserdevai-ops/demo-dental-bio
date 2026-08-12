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
  contentLabel: string | null;
  contentDeleted: boolean;
};

export type AdminAnalyticsHealth = {
  rawEvents: number;
  aggregateEvents: number;
  aggregateDrift: number;
  profilesWithDrift: number;
  latestReceivedAt: string | null;
  oldestReceivedAt: string | null;
  retentionOverage: number;
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

export type OwnerAnalyticsAudienceRow = {
  dimensionType: "source" | "referrer_domain" | "device_class";
  dimensionValue: string;
  totalViews: number;
  uniqueVisitors: number | null;
  isSuppressed: boolean;
};

export type OwnerAnalyticsAudience = {
  rows: OwnerAnalyticsAudienceRow[];
  privacyThreshold: 5;
  geography: {
    available: false;
    reason: "not_collected";
  };
};

export type OwnerConversionSummaryRow = {
  eventDate: string;
  conversions: number;
  uniqueConverters: number | null;
  primaryConversions: number;
  uniquePrimaryConverters: number | null;
};

export type OwnerConversionTotals = Omit<
  OwnerConversionSummaryRow,
  "eventDate"
>;

export type OwnerConversionGoal = {
  goalId: string;
  profileId: string;
  systemKey: string | null;
  name: string;
  eventType: string;
  entityUuid: string | null;
  entityBigint: number | null;
  isPrimary: boolean;
  attributionWindowDays: 7 | 30 | 60 | 90;
  enabled: boolean;
  valueMinor: number | null;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OwnerConversionGoalPerformance = {
  goalId: string;
  goalName: string;
  eventType: string;
  entityUuid: string | null;
  entityBigint: number | null;
  isPrimary: boolean;
  enabled: boolean;
  conversions: number;
  uniqueConverters: number | null;
  lastConversionAt: string | null;
};

export type OwnerCampaignPerformance = {
  campaignId: string | null;
  source: string;
  medium: string;
  campaign: string;
  profileViews: number;
  uniqueVisitors: number | null;
  clicks: number;
  uniqueClickers: number | null;
  ctr: number | null;
  conversions: number;
  uniqueConverters: number | null;
  conversionRate: number | null;
  lastConversionAt: string | null;
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
    contentLabel: row.content_label,
    contentDeleted: row.content_deleted,
  }));
}

export async function readOwnerAnalyticsTimezone(
  profileId: string,
): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("analytics_timezone")
    .eq("id", profileId)
    .single();
  if (error || !data) throw new Error("Unable to load analytics timezone");
  return data.analytics_timezone;
}

export async function readOwnerAnalyticsAudience(
  profileId: string,
  range: AnalyticsDateRange,
): Promise<OwnerAnalyticsAudience> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_owner_analytics_audience", {
    p_profile_id: profileId,
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });
  if (error) throw new Error("Unable to load analytics audience");

  return {
    rows: (data ?? []).map((row) => ({
      dimensionType:
        row.dimension_type as OwnerAnalyticsAudienceRow["dimensionType"],
      dimensionValue: row.dimension_value,
      totalViews: Number(row.total_views),
      uniqueVisitors:
        row.unique_visitors === null ? null : Number(row.unique_visitors),
      isSuppressed: row.is_suppressed,
    })),
    privacyThreshold: 5,
    geography: { available: false, reason: "not_collected" },
  };
}

export async function readOwnerConversionSummary(
  profileId: string,
  range: AnalyticsDateRange,
): Promise<OwnerConversionSummaryRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_owner_conversion_summary", {
    p_profile_id: profileId,
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });
  if (error) throw new Error("Unable to load conversion summary");
  return (data ?? []).map((row) => ({
    eventDate: row.event_date,
    conversions: Number(row.conversions),
    uniqueConverters:
      row.unique_converters === null ? null : Number(row.unique_converters),
    primaryConversions: Number(row.primary_conversions),
    uniquePrimaryConverters:
      row.unique_primary_converters === null
        ? null
        : Number(row.unique_primary_converters),
  }));
}

export async function readOwnerConversionTotals(
  profileId: string,
  range: AnalyticsDateRange,
): Promise<OwnerConversionTotals> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_owner_conversion_totals", {
    p_profile_id: profileId,
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });
  const row = data?.[0];
  if (error || !row) throw new Error("Unable to load conversion totals");
  return {
    conversions: Number(row.conversions),
    uniqueConverters:
      row.unique_converters === null ? null : Number(row.unique_converters),
    primaryConversions: Number(row.primary_conversions),
    uniquePrimaryConverters:
      row.unique_primary_converters === null
        ? null
        : Number(row.unique_primary_converters),
  };
}

export async function readOwnerConversionGoals(
  profileId: string,
): Promise<OwnerConversionGoal[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_owner_conversion_goals", {
    p_profile_id: profileId,
  });
  if (error) throw new Error("Unable to load conversion goals");
  return (data ?? []).map((row) => ({
    goalId: row.goal_id,
    profileId: row.profile_id,
    systemKey: row.system_key,
    name: row.name,
    eventType: row.event_type,
    entityUuid: row.entity_uuid,
    entityBigint: row.entity_bigint === null ? null : Number(row.entity_bigint),
    isPrimary: row.is_primary,
    attributionWindowDays:
      row.attribution_window_days as OwnerConversionGoal["attributionWindowDays"],
    enabled: row.enabled,
    valueMinor: row.value_minor === null ? null : Number(row.value_minor),
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function readOwnerConversionGoalPerformance(
  profileId: string,
  range: AnalyticsDateRange,
): Promise<OwnerConversionGoalPerformance[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "get_owner_conversion_goal_performance",
    {
      p_profile_id: profileId,
      p_start_date: range.startDate,
      p_end_date: range.endDate,
    },
  );
  if (error) throw new Error("Unable to load goal performance");
  return (data ?? []).map((row) => ({
    goalId: row.goal_id,
    goalName: row.goal_name,
    eventType: row.event_type,
    entityUuid: row.entity_uuid,
    entityBigint: row.entity_bigint === null ? null : Number(row.entity_bigint),
    isPrimary: row.is_primary,
    enabled: row.enabled,
    conversions: Number(row.conversions),
    uniqueConverters:
      row.unique_converters === null ? null : Number(row.unique_converters),
    lastConversionAt: row.last_conversion_at,
  }));
}

export async function readOwnerCampaignPerformance(
  profileId: string,
  range: AnalyticsDateRange,
): Promise<OwnerCampaignPerformance[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_owner_campaign_performance", {
    p_profile_id: profileId,
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });
  if (error) throw new Error("Unable to load campaign performance");
  return (data ?? []).map((row) => ({
    campaignId: row.managed_campaign_id,
    source: row.source,
    medium: row.medium,
    campaign: row.campaign,
    profileViews: Number(row.profile_views),
    uniqueVisitors:
      row.unique_visitors === null ? null : Number(row.unique_visitors),
    clicks: Number(row.clicks),
    uniqueClickers:
      row.unique_clickers === null ? null : Number(row.unique_clickers),
    ctr: row.ctr === null ? null : Number(row.ctr),
    conversions: Number(row.conversions),
    uniqueConverters:
      row.unique_converters === null ? null : Number(row.unique_converters),
    conversionRate:
      row.conversion_rate === null ? null : Number(row.conversion_rate),
    lastConversionAt: row.last_conversion_at,
  }));
}

export async function recordOwnerAnalyticsExport(input: {
  profileId: string;
  dataset: "overview" | "content" | "conversions" | "campaigns" | "audience";
  range: AnalyticsDateRange;
  timezone: string;
  rowCount: number;
}): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("record_analytics_export", {
    p_profile_id: input.profileId,
    p_dataset: input.dataset,
    p_start_date: input.range.startDate,
    p_end_date: input.range.endDate,
    p_timezone: input.timezone,
    p_row_count: input.rowCount,
    p_schema_version: 1,
  });
  if (error || !data) throw new Error("Unable to audit analytics export");
  return data;
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

export async function readAdminAnalyticsHealth(): Promise<AdminAnalyticsHealth> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_analytics_health");
  if (error || !data?.[0]) {
    throw new Error("Unable to load analytics health");
  }
  const row = data[0];
  return {
    rawEvents: Number(row.raw_events),
    aggregateEvents: Number(row.aggregate_events),
    aggregateDrift: Number(row.aggregate_drift),
    profilesWithDrift: Number(row.profiles_with_drift),
    latestReceivedAt: row.latest_received_at,
    oldestReceivedAt: row.oldest_received_at,
    retentionOverage: Number(row.retention_overage),
  };
}
