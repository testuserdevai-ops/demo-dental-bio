import "server-only";

import type {
  AnalyticsPlan,
  AnalyticsQuery,
  OwnerAnalyticsViewModel,
} from "@/lib/analytics/dashboard-contract";
import { rangesForPlan } from "./query";

export function analyticsPlanFromSubscription(
  subscriptionStatus: string | null,
): AnalyticsPlan {
  if (subscriptionStatus === "PREMIUM PRO") return "premium";
  if (subscriptionStatus === "PRO") return "pro";
  return "free";
}

/**
 * Typed owner analytics seam. Authoritative aggregate readers are injected
 * here; dashboard components never import database rows directly.
 */
export async function getOwnerAnalyticsDashboard(
  profileId: string,
  plan: AnalyticsPlan,
  query: AnalyticsQuery,
): Promise<OwnerAnalyticsViewModel> {
  return {
    profileId,
    plan,
    state: "empty",
    query,
    permittedRanges: rangesForPlan(plan),
    dataThrough: null,
    lastUpdatedAt: null,
    stale: false,
    metrics: [],
    trend: [],
    patientIntent: [],
    content: [],
  };
}
