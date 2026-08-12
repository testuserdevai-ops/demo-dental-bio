import "server-only";

import type {
  OwnerAnalyticsAudienceRow,
  OwnerAnalyticsContentRow,
  OwnerAnalyticsSummaryRow,
  OwnerCampaignPerformance,
  OwnerConversionGoalPerformance,
} from "./repository";

export type AnalyticsExportDataset =
  "overview" | "content" | "conversions" | "campaigns" | "audience";

const columns = {
  overview: [
    "event_date",
    "profile_views",
    "unique_profile_visitors",
    "outbound_actions",
    "unique_action_visitors",
    "conversions",
    "unique_converting_visitors",
  ],
  content: [
    "action_type",
    "section",
    "entity_id",
    "visible_position",
    "total_events",
    "unique_visitors",
    "last_active_at",
  ],
  conversions: [
    "goal_id",
    "goal_name",
    "event_type",
    "is_primary",
    "enabled",
    "conversions",
    "unique_converters",
    "last_conversion_at",
  ],
  campaigns: [
    "campaign_id",
    "source",
    "medium",
    "campaign",
    "profile_views",
    "unique_visitors",
    "clicks",
    "unique_clickers",
    "ctr_percent",
    "conversions",
    "unique_converters",
    "conversion_rate_percent",
    "last_conversion_at",
  ],
  audience: [
    "dimension_type",
    "dimension_value",
    "total_views",
    "unique_visitors",
    "is_suppressed",
  ],
} as const;

const csv = (value: string | number | boolean | null) => {
  const text = value === null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export type AnalyticsExportRows = {
  overview: OwnerAnalyticsSummaryRow[];
  content: OwnerAnalyticsContentRow[];
  conversions: OwnerConversionGoalPerformance[];
  campaigns: OwnerCampaignPerformance[];
  audience: OwnerAnalyticsAudienceRow[];
};

export function analyticsCsvRows<D extends AnalyticsExportDataset>(
  dataset: D,
  rows: AnalyticsExportRows[D],
): Array<Array<string | number | boolean | null>> {
  if (dataset === "overview") {
    return (rows as AnalyticsExportRows["overview"]).map((row) => [
      row.eventDate,
      row.profileViews,
      row.uniqueProfileVisitors,
      row.outboundActions,
      row.uniqueActionVisitors,
      row.conversions,
      row.uniqueConvertingVisitors,
    ]);
  }
  if (dataset === "content") {
    return (rows as AnalyticsExportRows["content"]).map((row) => [
      row.actionType,
      row.section,
      row.entityUuid ?? row.entityBigint,
      row.visiblePosition,
      row.totalEvents,
      row.uniqueVisitors,
      row.lastActiveAt,
    ]);
  }
  if (dataset === "conversions") {
    return (rows as AnalyticsExportRows["conversions"]).map((row) => [
      row.goalId,
      row.goalName,
      row.eventType,
      row.isPrimary,
      row.enabled,
      row.conversions,
      row.uniqueConverters,
      row.lastConversionAt,
    ]);
  }
  if (dataset === "campaigns") {
    return (rows as AnalyticsExportRows["campaigns"]).map((row) => [
      row.campaignId,
      row.source,
      row.medium,
      row.campaign,
      row.profileViews,
      row.uniqueVisitors,
      row.clicks,
      row.uniqueClickers,
      row.ctr,
      row.conversions,
      row.uniqueConverters,
      row.conversionRate,
      row.lastConversionAt,
    ]);
  }
  return (rows as AnalyticsExportRows["audience"]).map((row) => [
    row.dimensionType,
    row.dimensionValue,
    row.totalViews,
    row.uniqueVisitors,
    row.isSuppressed,
  ]);
}

export function createAnalyticsCsv<D extends AnalyticsExportDataset>(input: {
  dataset: D;
  profileId: string;
  startDate: string;
  endDate: string;
  timezone: string;
  generatedAt: string;
  rows: AnalyticsExportRows[D];
}): string {
  const metadata = [
    ["schema_version", 1],
    ["dataset", input.dataset],
    ["profile_id", input.profileId],
    ["start_date", input.startDate],
    ["end_date", input.endDate],
    ["timezone", input.timezone],
    ["generated_at", input.generatedAt],
  ];
  const data = analyticsCsvRows(input.dataset, input.rows);
  return `\uFEFF${metadata
    .map(([key, value]) => `# ${key}=${csv(value)}`)
    .join("\r\n")}\r\n${columns[input.dataset].join(",")}\r\n${data
    .map((row) => row.map(csv).join(","))
    .join("\r\n")}\r\n`;
}

export const PROHIBITED_EXPORT_FIELDS = [
  "visitor_hash",
  "session_hash",
  "request_hash",
  "ip_address",
  "email",
  "phone",
  "enquiry_content",
  "clinical_information",
] as const;

export function analyticsExportColumns(dataset: AnalyticsExportDataset) {
  return columns[dataset];
}
