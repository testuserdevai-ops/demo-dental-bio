import "server-only";

import type {
  AnalyticsMetric,
  AnalyticsPlan,
  AnalyticsQuery,
  AnalyticsRange,
  BreakdownRow,
  FunnelStage,
  OwnerAnalyticsViewModel,
  TopContentRow,
} from "@/lib/analytics/dashboard-contract";
import {
  readOwnerAnalyticsAudience,
  readOwnerAnalyticsContent,
  readOwnerAnalyticsSummary,
  readOwnerAnalyticsTotals,
  readOwnerCampaignPerformance,
  readOwnerConversionGoalPerformance,
  readOwnerConversionSummary,
  readOwnerConversionTotals,
  type AnalyticsDateRange,
  type OwnerAnalyticsAudience,
  type OwnerAnalyticsContentRow,
  type OwnerAnalyticsSummaryRow,
  type OwnerAnalyticsTotals,
  type OwnerCampaignPerformance,
  type OwnerConversionGoalPerformance,
  type OwnerConversionSummaryRow,
  type OwnerConversionTotals,
} from "@/lib/analytics/repository";
import { rangesForPlan } from "./query";

const DAY_MS = 86_400_000;

const METRIC_DEFINITIONS = {
  views: "Accepted profile views during this date range.",
  uniqueVisitors:
    "Estimated distinct visitors from privacy-safe identifiers available during this date range.",
  clicks: "Accepted link and action clicks during this date range.",
  clickRate: "Unique clickers divided by unique visitors.",
  conversions: "Configured accepted conversion events, not every click.",
  conversionRate: "Visitors with a conversion divided by unique visitors.",
  uniqueConverters:
    "Estimated distinct visitors who completed at least one enabled goal.",
  primaryConversions:
    "Accepted events matching the enabled primary goal for this range.",
  primaryConversionRate:
    "Distinct primary-goal converters divided by unique visitors.",
} as const;

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

const INTENT_LABELS: Record<string, string> = {
  booking_click: "Booking clicks",
  phone_click: "Phone taps",
  email_click: "Email taps",
  directions_click: "Directions taps",
  enquiry_submit: "Enquiry submissions",
};

const CONTENT_LABELS: Record<string, string> = {
  link_click: "Link",
  blog_click: "Blog",
  video_open: "Video",
  gallery_open: "Gallery item",
  product_click: "Product",
  external_review_click: "Review page",
  treatment_cta_click: "Treatment action",
  service_cta_click: "Service action",
  booking_click: "Booking action",
  directions_click: "Directions action",
  email_click: "Email action",
  phone_click: "Phone action",
  social_click: "Social profile",
  share_click: "Share action",
  enquiry_submit: "Enquiry submission",
};

const CONVERSION_ACTIONS = new Set([
  "treatment_cta_click",
  "service_cta_click",
  "booking_click",
  "directions_click",
  "email_click",
  "phone_click",
  "enquiry_submit",
]);

export type OwnerAnalyticsDependencies = {
  readSummary(
    profileId: string,
    range: AnalyticsDateRange,
  ): Promise<OwnerAnalyticsSummaryRow[]>;
  readTotals(
    profileId: string,
    range: AnalyticsDateRange,
  ): Promise<OwnerAnalyticsTotals>;
  readContent(
    profileId: string,
    range: AnalyticsDateRange,
  ): Promise<OwnerAnalyticsContentRow[]>;
  readAudience(
    profileId: string,
    range: AnalyticsDateRange,
  ): Promise<OwnerAnalyticsAudience>;
  readConversionSummary?(
    profileId: string,
    range: AnalyticsDateRange,
  ): Promise<OwnerConversionSummaryRow[]>;
  readConversionTotals?(
    profileId: string,
    range: AnalyticsDateRange,
  ): Promise<OwnerConversionTotals>;
  readGoalPerformance?(
    profileId: string,
    range: AnalyticsDateRange,
  ): Promise<OwnerConversionGoalPerformance[]>;
  readCampaignPerformance?(
    profileId: string,
    range: AnalyticsDateRange,
  ): Promise<OwnerCampaignPerformance[]>;
  now(): Date;
};

const productionDependencies: OwnerAnalyticsDependencies = {
  readSummary: readOwnerAnalyticsSummary,
  readTotals: readOwnerAnalyticsTotals,
  readContent: readOwnerAnalyticsContent,
  readAudience: readOwnerAnalyticsAudience,
  readConversionSummary: readOwnerConversionSummary,
  readConversionTotals: readOwnerConversionTotals,
  readGoalPerformance: readOwnerConversionGoalPerformance,
  readCampaignPerformance: readOwnerCampaignPerformance,
  now: () => new Date(),
};

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

export function resolveAnalyticsDateRanges(
  range: AnalyticsRange,
  now: Date,
): { current: AnalyticsDateRange; previous: AnalyticsDateRange | null } {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const days = RANGE_DAYS[range];
  const start = new Date(end.getTime() - (days - 1) * DAY_MS);
  const current = {
    startDate: toDateString(start),
    endDate: toDateString(end),
  };
  const previousEnd = new Date(start.getTime() - DAY_MS);
  const previousStart = new Date(previousEnd.getTime() - (days - 1) * DAY_MS);
  return {
    current,
    previous: {
      startDate: toDateString(previousStart),
      endDate: toDateString(previousEnd),
    },
  };
}

export function analyticsPlanFromSubscription(
  subscriptionStatus: string | null,
): AnalyticsPlan {
  if (subscriptionStatus === "PREMIUM PRO") return "premium";
  if (subscriptionStatus === "PRO") return "pro";
  return "free";
}

function percent(numerator: number, denominator: number): number {
  return denominator === 0
    ? 0
    : Number(((numerator / denominator) * 100).toFixed(1));
}

function comparison(
  current: number | null,
  previous: number | null | undefined,
): number | null {
  if (
    current === null ||
    previous === undefined ||
    previous === null ||
    previous === 0
  )
    return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function buildMetrics(
  totals: OwnerAnalyticsTotals,
  previous: OwnerAnalyticsTotals | null,
  plan: AnalyticsPlan,
  configured?: OwnerConversionTotals,
  previousConfigured?: OwnerConversionTotals | null,
): AnalyticsMetric[] {
  const metrics: AnalyticsMetric[] = [
    {
      id: "views",
      label: "Views",
      value: totals.profileViews,
      format: "number",
      change: comparison(totals.profileViews, previous?.profileViews),
      availability: "available",
      definition: METRIC_DEFINITIONS.views,
    },
    {
      id: "uniqueVisitors",
      label: "Unique visitors",
      value: totals.uniqueProfileVisitors,
      format: "number",
      change: comparison(
        totals.uniqueProfileVisitors,
        previous?.uniqueProfileVisitors,
      ),
      availability:
        totals.uniqueProfileVisitors === null ? "unavailable" : "available",
      definition: METRIC_DEFINITIONS.uniqueVisitors,
    },
    {
      id: "clicks",
      label: "Clicks",
      value: totals.outboundActions,
      format: "number",
      change: comparison(totals.outboundActions, previous?.outboundActions),
      availability: "available",
      definition: METRIC_DEFINITIONS.clicks,
    },
    {
      id: "clickRate",
      label: "Profile click rate",
      value:
        totals.uniqueActionVisitors === null ||
        totals.uniqueProfileVisitors === null
          ? null
          : percent(totals.uniqueActionVisitors, totals.uniqueProfileVisitors),
      format: "percent",
      change:
        previous === null ||
        totals.uniqueActionVisitors === null ||
        totals.uniqueProfileVisitors === null ||
        previous.uniqueActionVisitors === null ||
        previous.uniqueProfileVisitors === null
          ? null
          : Number(
              (
                percent(
                  totals.uniqueActionVisitors,
                  totals.uniqueProfileVisitors,
                ) -
                percent(
                  previous.uniqueActionVisitors,
                  previous.uniqueProfileVisitors,
                )
              ).toFixed(1),
            ),
      availability:
        totals.uniqueActionVisitors === null ||
        totals.uniqueProfileVisitors === null
          ? "unavailable"
          : "available",
      definition: METRIC_DEFINITIONS.clickRate,
    },
  ];

  const conversions = configured?.conversions ?? totals.conversions;
  const uniqueConverters =
    configured?.uniqueConverters ?? totals.uniqueConvertingVisitors;
  const previousConversions =
    previousConfigured?.conversions ?? previous?.conversions;
  const previousUniqueConverters =
    previousConfigured?.uniqueConverters ?? previous?.uniqueConvertingVisitors;

  if (plan !== "free" && conversions !== null) {
    metrics.push(
      {
        id: "conversions",
        label: "Conversions",
        value: conversions,
        format: "number",
        change: comparison(conversions, previousConversions ?? undefined),
        availability: "available",
        definition: METRIC_DEFINITIONS.conversions,
      },
      {
        id: "uniqueConverters",
        label: "Unique converters",
        value: uniqueConverters,
        format: "number",
        change: comparison(uniqueConverters, previousUniqueConverters),
        availability: uniqueConverters === null ? "unavailable" : "available",
        definition: METRIC_DEFINITIONS.uniqueConverters,
      },
      {
        id: "conversionRate",
        label: "Conversion rate",
        value:
          uniqueConverters === null || totals.uniqueProfileVisitors === null
            ? null
            : percent(uniqueConverters, totals.uniqueProfileVisitors),
        format: "percent",
        change:
          uniqueConverters === null ||
          totals.uniqueProfileVisitors === null ||
          previousUniqueConverters === null ||
          previousUniqueConverters === undefined ||
          previous?.uniqueProfileVisitors === null ||
          previous === null
            ? null
            : Number(
                (
                  percent(uniqueConverters, totals.uniqueProfileVisitors) -
                  percent(
                    previousUniqueConverters,
                    previous.uniqueProfileVisitors,
                  )
                ).toFixed(1),
              ),
        availability:
          uniqueConverters === null || totals.uniqueProfileVisitors === null
            ? "unavailable"
            : "available",
        definition: METRIC_DEFINITIONS.conversionRate,
      },
    );
    if (configured) {
      metrics.push(
        {
          id: "primaryConversions",
          label: "Primary-goal conversions",
          value: configured.primaryConversions,
          format: "number",
          change: comparison(
            configured.primaryConversions,
            previousConfigured?.primaryConversions,
          ),
          availability: "available",
          definition: METRIC_DEFINITIONS.primaryConversions,
        },
        {
          id: "primaryConversionRate",
          label: "Primary-goal rate",
          value:
            configured.uniquePrimaryConverters === null ||
            totals.uniqueProfileVisitors === null
              ? null
              : percent(
                  configured.uniquePrimaryConverters,
                  totals.uniqueProfileVisitors,
                ),
          format: "percent",
          change: null,
          availability:
            configured.uniquePrimaryConverters === null ||
            totals.uniqueProfileVisitors === null
              ? "unavailable"
              : "available",
          definition: METRIC_DEFINITIONS.primaryConversionRate,
        },
      );
    }
  }
  return metrics;
}

function contentId(row: OwnerAnalyticsContentRow) {
  return `${row.actionType}:${row.entityUuid ?? row.entityBigint ?? row.actionDimension ?? "profile"}`;
}

function buildContent(
  rows: OwnerAnalyticsContentRow[],
  totals: OwnerAnalyticsTotals,
  plan: AnalyticsPlan,
): TopContentRow[] {
  return rows.map((row) => {
    const identity = row.entityUuid ?? row.entityBigint ?? row.actionDimension;
    const label = CONTENT_LABELS[row.actionType] ?? "Profile action";
    return {
      id: contentId(row),
      actionType: row.actionType,
      entityId: String(identity ?? "profile"),
      title:
        row.contentLabel ??
        (identity ? `${label} · ${String(identity).slice(-6)}` : label),
      type: label,
      section: row.section,
      position: row.visiblePosition,
      clicks: row.totalEvents,
      uniqueClickers: row.uniqueVisitors,
      ctr:
        row.uniqueVisitors === null || totals.uniqueProfileVisitors === null
          ? null
          : percent(row.uniqueVisitors, totals.uniqueProfileVisitors),
      ...(plan !== "free"
        ? {
            conversions: CONVERSION_ACTIONS.has(row.actionType)
              ? row.totalEvents
              : 0,
          }
        : {}),
      lastActiveAt: row.lastActiveAt,
      deleted: row.contentDeleted,
    };
  });
}

function buildIntent(rows: OwnerAnalyticsContentRow[]): BreakdownRow[] {
  const intentRows = rows.filter((row) => INTENT_LABELS[row.actionType]);
  const total = intentRows.reduce((sum, row) => sum + row.totalEvents, 0);
  return intentRows.map((row) => ({
    id: contentId(row),
    label: INTENT_LABELS[row.actionType],
    count: row.totalEvents,
    percentage: percent(row.totalEvents, total),
  }));
}

function buildFunnel(
  totals: OwnerAnalyticsTotals,
  plan: AnalyticsPlan,
): FunnelStage[] | undefined {
  if (
    plan === "free" ||
    totals.uniqueConvertingVisitors === null ||
    totals.uniqueActionVisitors === null ||
    totals.uniqueProfileVisitors === null ||
    totals.conversions === null
  ) {
    return undefined;
  }
  return [
    {
      id: "visitors",
      label: "Unique profile visitors",
      count: totals.uniqueProfileVisitors,
      previousStepRate: null,
    },
    {
      id: "engaged",
      label: "Engaged visitors",
      count: totals.uniqueActionVisitors,
      previousStepRate: percent(
        totals.uniqueActionVisitors,
        totals.uniqueProfileVisitors,
      ),
    },
    {
      id: "converted",
      label: "Visitors with a conversion",
      count: totals.uniqueConvertingVisitors,
      previousStepRate: percent(
        totals.uniqueConvertingVisitors,
        totals.uniqueActionVisitors,
      ),
    },
  ];
}

function audienceRows(
  audience: OwnerAnalyticsAudience,
  dimensionTypes: Array<"source" | "referrer_domain" | "device_class">,
): BreakdownRow[] {
  const rows = audience.rows.filter((row) =>
    dimensionTypes.includes(row.dimensionType),
  );
  const total = rows.reduce((sum, row) => sum + row.totalViews, 0);
  return rows.map((row) => ({
    id: `${row.dimensionType}:${row.dimensionValue}`,
    label:
      row.dimensionValue === "other"
        ? "Other"
        : row.dimensionValue
            .replace(/_/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    count: row.totalViews,
    percentage: percent(row.totalViews, total),
    ...(row.isSuppressed ? { availability: "suppressed" as const } : {}),
  }));
}

/** Maps only authoritative aggregate fields; unsupported audience data stays absent. */
export async function getOwnerAnalyticsDashboard(
  profileId: string,
  plan: AnalyticsPlan,
  query: AnalyticsQuery,
  dependencies: OwnerAnalyticsDependencies = productionDependencies,
): Promise<OwnerAnalyticsViewModel> {
  const ranges = resolveAnalyticsDateRanges(query.range, dependencies.now());
  const [
    summary,
    totals,
    content,
    previousTotals,
    audience,
    conversionSummary,
    conversionTotals,
    previousConversionTotals,
    goalPerformance,
    campaignPerformance,
  ] = await Promise.all([
    dependencies.readSummary(profileId, ranges.current),
    dependencies.readTotals(profileId, ranges.current),
    dependencies.readContent(profileId, ranges.current),
    plan !== "free" && ranges.previous
      ? dependencies.readTotals(profileId, ranges.previous)
      : Promise.resolve(null),
    plan === "free"
      ? Promise.resolve(null)
      : dependencies.readAudience(profileId, ranges.current),
    plan === "free" || !dependencies.readConversionSummary
      ? Promise.resolve([])
      : dependencies.readConversionSummary(profileId, ranges.current),
    plan === "free" || !dependencies.readConversionTotals
      ? Promise.resolve(null)
      : dependencies.readConversionTotals(profileId, ranges.current),
    plan === "free" || !ranges.previous || !dependencies.readConversionTotals
      ? Promise.resolve(null)
      : dependencies.readConversionTotals(profileId, ranges.previous),
    plan === "free" || !dependencies.readGoalPerformance
      ? Promise.resolve([])
      : dependencies.readGoalPerformance(profileId, ranges.current),
    plan === "free" || !dependencies.readCampaignPerformance
      ? Promise.resolve([])
      : dependencies.readCampaignPerformance(profileId, ranges.current),
  ]);
  const empty =
    totals.profileViews === 0 &&
    totals.outboundActions === 0 &&
    content.length === 0;
  const now = dependencies.now().toISOString();
  const showNoContactInsight =
    totals.profileViews >= 25 && totals.conversions === 0;

  return {
    profileId,
    plan,
    state: empty ? "empty" : "ready",
    query,
    permittedRanges: rangesForPlan(plan),
    dataThrough: empty ? null : now,
    lastUpdatedAt: empty ? null : now,
    stale: false,
    metrics: buildMetrics(
      totals,
      previousTotals,
      plan,
      conversionTotals ?? undefined,
      previousConversionTotals,
    ),
    trend: summary.map((row) => ({
      bucket: row.eventDate,
      views: row.profileViews,
      uniqueVisitors: row.uniqueProfileVisitors,
      clicks: row.outboundActions,
      ...(row.conversions === null && conversionSummary.length === 0
        ? {}
        : {
            conversions:
              conversionSummary.find(
                (conversion) => conversion.eventDate === row.eventDate,
              )?.conversions ?? 0,
          }),
    })),
    patientIntent: buildIntent(content),
    content: buildContent(content, totals, plan),
    funnel: buildFunnel(
      conversionTotals
        ? {
            ...totals,
            conversions: conversionTotals.conversions,
            uniqueConvertingVisitors: conversionTotals.uniqueConverters,
          }
        : totals,
      plan,
    ),
    ...(showNoContactInsight
      ? {
          insight: {
            id: "no-contact-action" as const,
            title: "Visitors are viewing, but no contact action was tracked",
            description: `${totals.profileViews.toLocaleString()} qualified views and no tracked contact or booking click were recorded in this range. People may still contact you through an untracked route. Check that your preferred action is clear and current.`,
            actionHref: "/dashboard/profile",
            actionLabel: "Review contact actions",
          },
        }
      : {}),
    ...(goalPerformance.length
      ? {
          conversionGoals: goalPerformance.map((goal) => ({
            id: goal.goalId,
            name: goal.goalName,
            eventType: goal.eventType,
            isPrimary: goal.isPrimary,
            enabled: goal.enabled,
            conversions: goal.conversions,
            uniqueConverters: goal.uniqueConverters,
            conversionRate:
              goal.uniqueConverters === null ||
              totals.uniqueProfileVisitors === null
                ? null
                : percent(goal.uniqueConverters, totals.uniqueProfileVisitors),
            lastConversionAt: goal.lastConversionAt,
          })),
        }
      : {}),
    ...(campaignPerformance.length
      ? {
          campaigns: campaignPerformance.map((campaign) => ({
            id:
              campaign.campaignId ??
              `${campaign.source}:${campaign.medium}:${campaign.campaign}`,
            source: campaign.source,
            medium: campaign.medium,
            campaign: campaign.campaign,
            visitors: campaign.uniqueVisitors,
            clicks: campaign.clicks,
            ctr: campaign.ctr,
            conversions: campaign.conversions,
            conversionRate: campaign.conversionRate,
          })),
        }
      : {}),
    ...(audience
      ? {
          referrers: audienceRows(audience, ["source"]),
          devices: audienceRows(audience, ["device_class"]),
        }
      : {}),
  };
}
