export const ANALYTICS_TABS = [
  "overview",
  "content",
  "audience",
  "conversions",
] as const;

export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

export const ANALYTICS_RANGES = [
  "7d",
  "30d",
  "90d",
  "365d",
  "lifetime",
] as const;

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];
export type AnalyticsPlan = "free" | "pro" | "premium";
export type AnalyticsDataState = "ready" | "empty" | "error" | "processing";
export type MetricAvailability = "available" | "unavailable" | "suppressed";

export type AnalyticsQuery = {
  tab: AnalyticsTab;
  range: AnalyticsRange;
  timezone: string;
};

export type AnalyticsMetric = {
  id:
    | "views"
    | "uniqueVisitors"
    | "clicks"
    | "clickRate"
    | "conversions"
    | "conversionRate";
  label: string;
  value: number | null;
  format: "number" | "percent";
  change: number | null;
  availability: MetricAvailability;
  definition: string;
};

export type AnalyticsTrendPoint = {
  bucket: string;
  views: number;
  uniqueVisitors: number;
  clicks: number;
  conversions?: number;
};

export type TopContentRow = {
  id: string;
  title: string;
  type: string;
  section: string;
  position: number | null;
  clicks: number;
  uniqueClickers: number;
  ctr: number;
  conversions?: number;
  lastActiveAt: string | null;
  deleted?: boolean;
};

export type BreakdownRow = {
  id: string;
  label: string;
  count: number | null;
  percentage: number | null;
  availability?: MetricAvailability;
};

export type FunnelStage = {
  id: string;
  label: string;
  count: number;
  previousStepRate: number | null;
};

export type OwnerAnalyticsViewModel = {
  profileId: string;
  plan: AnalyticsPlan;
  state: AnalyticsDataState;
  query: AnalyticsQuery;
  permittedRanges: AnalyticsRange[];
  dataThrough: string | null;
  lastUpdatedAt: string | null;
  stale: boolean;
  metrics: AnalyticsMetric[];
  trend: AnalyticsTrendPoint[];
  patientIntent: BreakdownRow[];
  content: TopContentRow[];
  referrers?: BreakdownRow[];
  devices?: BreakdownRow[];
  geography?: BreakdownRow[];
  funnel?: FunnelStage[];
  errorMessage?: string;
};
