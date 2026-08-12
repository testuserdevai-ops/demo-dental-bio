import {
  ANALYTICS_RANGES,
  ANALYTICS_TABS,
  type AnalyticsPlan,
  type AnalyticsQuery,
  type AnalyticsRange,
  type AnalyticsTab,
} from "@/lib/analytics/dashboard-contract";

export const rangesForPlan = (plan: AnalyticsPlan): AnalyticsRange[] =>
  plan === "free"
    ? ["7d", "lifetime"]
    : plan === "pro"
      ? ["7d", "30d", "90d", "365d"]
      : [...ANALYTICS_RANGES];

export function parseAnalyticsQuery(
  searchParams: Record<string, string | string[] | undefined>,
  plan: AnalyticsPlan,
): AnalyticsQuery {
  const tabValue = Array.isArray(searchParams.tab)
    ? searchParams.tab[0]
    : searchParams.tab;
  const rangeValue = Array.isArray(searchParams.range)
    ? searchParams.range[0]
    : searchParams.range;
  const permittedRanges = rangesForPlan(plan);

  return {
    tab: ANALYTICS_TABS.includes(tabValue as AnalyticsTab)
      ? (tabValue as AnalyticsTab)
      : "overview",
    range:
      ANALYTICS_RANGES.includes(rangeValue as AnalyticsRange) &&
      permittedRanges.includes(rangeValue as AnalyticsRange)
        ? (rangeValue as AnalyticsRange)
        : "7d",
    timezone: "Africa/Cairo",
  };
}
