import {
  ANALYTICS_RANGES,
  ANALYTICS_TABS,
  type AnalyticsPlan,
  type AnalyticsQuery,
  type AnalyticsRange,
  type AnalyticsTab,
} from "@/lib/analytics/dashboard-contract";

export const rangesForPlan = (plan: AnalyticsPlan): AnalyticsRange[] =>
  plan === "free" ? ["7d"] : ["7d", "30d", "90d", "365d"];

const CONTENT_ACTIONS = new Set([
  "link_click",
  "blog_click",
  "video_open",
  "gallery_open",
  "product_click",
  "external_review_click",
  "review_expand",
  "treatment_expand",
  "treatment_cta_click",
  "service_expand",
  "service_cta_click",
  "booking_click",
  "directions_click",
  "email_click",
  "phone_click",
  "social_click",
  "share_click",
  "navigation_click",
  "enquiry_submit",
]);

const CONTENT_ID_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[1-9][0-9]{0,18}|[a-z][a-z0-9_]{0,31}|profile)$/i;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseAnalyticsQuery(
  searchParams: Record<string, string | string[] | undefined>,
  plan: AnalyticsPlan,
  timezone = "UTC",
): AnalyticsQuery {
  const tabValue = Array.isArray(searchParams.tab)
    ? searchParams.tab[0]
    : searchParams.tab;
  const rangeValue = Array.isArray(searchParams.range)
    ? searchParams.range[0]
    : searchParams.range;
  const permittedRanges = rangesForPlan(plan);
  const contentAction = first(searchParams.contentAction);
  const contentId = first(searchParams.contentId);

  return {
    tab: ANALYTICS_TABS.includes(tabValue as AnalyticsTab)
      ? (tabValue as AnalyticsTab)
      : "overview",
    range:
      ANALYTICS_RANGES.includes(rangeValue as AnalyticsRange) &&
      permittedRanges.includes(rangeValue as AnalyticsRange)
        ? (rangeValue as AnalyticsRange)
        : "7d",
    timezone,
    content:
      contentAction &&
      contentId &&
      CONTENT_ACTIONS.has(contentAction) &&
      CONTENT_ID_PATTERN.test(contentId)
        ? { actionType: contentAction, entityId: contentId }
        : null,
  };
}
