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
  type AnalyticsDateRange,
  type OwnerAnalyticsAudience,
  type OwnerAnalyticsContentRow,
  type OwnerAnalyticsSummaryRow,
  type OwnerAnalyticsTotals,
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
  now(): Date;
};

const productionDependencies: OwnerAnalyticsDependencies = {
  readSummary: readOwnerAnalyticsSummary,
  readTotals: readOwnerAnalyticsTotals,
  readContent: readOwnerAnalyticsContent,
  readAudience: readOwnerAnalyticsAudience,
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

  if (plan !== "free" && totals.conversions !== null) {
    metrics.push(
      {
        id: "conversions",
        label: "Conversions",
        value: totals.conversions,
        format: "number",
        change: comparison(
          totals.conversions,
          previous?.conversions ?? undefined,
        ),
        availability: "available",
        definition: METRIC_DEFINITIONS.conversions,
      },
      {
        id: "conversionRate",
        label: "Conversion rate",
        value:
          totals.uniqueConvertingVisitors === null ||
          totals.uniqueProfileVisitors === null
            ? null
            : percent(
                totals.uniqueConvertingVisitors,
                totals.uniqueProfileVisitors,
              ),
        format: "percent",
        change:
          totals.uniqueConvertingVisitors === null ||
          totals.uniqueProfileVisitors === null ||
          previous?.uniqueConvertingVisitors === null ||
          previous?.uniqueProfileVisitors === null ||
          previous === null
            ? null
            : Number(
                (
                  percent(
                    totals.uniqueConvertingVisitors,
                    totals.uniqueProfileVisitors,
                  ) -
                  percent(
                    previous.uniqueConvertingVisitors,
                    previous.uniqueProfileVisitors,
                  )
                ).toFixed(1),
              ),
        availability:
          totals.uniqueConvertingVisitors === null ||
          totals.uniqueProfileVisitors === null
            ? "unavailable"
            : "available",
        definition: METRIC_DEFINITIONS.conversionRate,
      },
    );
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
  const [summary, totals, content, previousTotals, audience] =
    await Promise.all([
      dependencies.readSummary(profileId, ranges.current),
      dependencies.readTotals(profileId, ranges.current),
      dependencies.readContent(profileId, ranges.current),
      plan !== "free" && ranges.previous
        ? dependencies.readTotals(profileId, ranges.previous)
        : Promise.resolve(null),
      plan === "free"
        ? Promise.resolve(null)
        : dependencies.readAudience(profileId, ranges.current),
    ]);
  const empty =
    totals.profileViews === 0 &&
    totals.outboundActions === 0 &&
    content.length === 0;
  const now = dependencies.now().toISOString();

  return {
    profileId,
    plan,
    state: empty ? "empty" : "ready",
    query,
    permittedRanges: rangesForPlan(plan),
    dataThrough: empty ? null : now,
    lastUpdatedAt: empty ? null : now,
    stale: false,
    metrics: buildMetrics(totals, previousTotals, plan),
    trend: summary.map((row) => ({
      bucket: row.eventDate,
      views: row.profileViews,
      uniqueVisitors: row.uniqueProfileVisitors,
      clicks: row.outboundActions,
      ...(row.conversions === null ? {} : { conversions: row.conversions }),
    })),
    patientIntent: buildIntent(content),
    content: buildContent(content, totals, plan),
    funnel: buildFunnel(totals, plan),
    ...(audience
      ? {
          referrers: audienceRows(audience, ["source"]),
          devices: audienceRows(audience, ["device_class"]),
        }
      : {}),
  };
}
