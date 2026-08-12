export const ADMIN_OVERVIEW_RANGES = [7, 30, 90] as const;
export type AdminOverviewRange = (typeof ADMIN_OVERVIEW_RANGES)[number];

export const ADMIN_OVERVIEW_PLANS = ["all", "free", "pro", "premium"] as const;
export type AdminOverviewPlan = (typeof ADMIN_OVERVIEW_PLANS)[number];

export type AdminOverviewFilters = {
  days: AdminOverviewRange;
  plan: AdminOverviewPlan;
  domain: string;
};

export type ComparisonMetric = {
  value: number;
  previous: number;
  changePercent: number | null;
};

export type AdminOverview = {
  filters: AdminOverviewFilters;
  dataThrough: string;
  users: {
    total: number;
    signups: ComparisonMetric;
    active7Days: number | null;
    active30Days: number | null;
    readyProfiles: number;
    incompleteProfiles: number;
  };
  plans: {
    free: number;
    trial: number;
    paid: number;
    expired: number;
    cancelled: null;
    pastDue: null;
  };
  profileAnalytics: {
    views: ComparisonMetric | null;
    outboundActions: ComparisonMetric | null;
    uniqueVisitors: number | null;
    trend: Array<{
      date: string;
      views: number;
      outboundActions: number;
    }>;
    state: "available" | "processing" | "unavailable";
  };
  billing: {
    monthlyRecurringRevenue: number | null;
    trialToPaidRate: number | null;
    state: "available" | "delayed" | "unavailable";
  };
  operations: {
    failedOperations: number | null;
    pendingReports: number | null;
    breachedSla: number | null;
    state: "available" | "delayed" | "unavailable";
    analytics: {
      state: "healthy" | "drift" | "empty";
      rawEvents: number;
      aggregateEvents: number;
      aggregateDrift: number;
      profilesWithDrift: number;
      retentionOverage: number;
      latestReceivedAt: string | null;
    };
  };
};

export function comparisonMetric(value: number, previous: number) {
  return {
    value,
    previous,
    changePercent:
      previous === 0
        ? value === 0
          ? 0
          : null
        : ((value - previous) / previous) * 100,
  } satisfies ComparisonMetric;
}

export function parseAdminOverviewFilters(input: {
  days?: string;
  plan?: string;
  domain?: string;
}): AdminOverviewFilters {
  const parsedDays = Number(input.days);
  const days = ADMIN_OVERVIEW_RANGES.includes(parsedDays as AdminOverviewRange)
    ? (parsedDays as AdminOverviewRange)
    : 30;
  const plan = ADMIN_OVERVIEW_PLANS.includes(input.plan as AdminOverviewPlan)
    ? (input.plan as AdminOverviewPlan)
    : "all";
  const domain =
    typeof input.domain === "string" && /^[a-z0-9.-]{1,80}$/i.test(input.domain)
      ? input.domain.toLowerCase()
      : "all";
  return { days, plan, domain };
}
