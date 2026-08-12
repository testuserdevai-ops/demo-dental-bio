import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { readAdminAnalyticsOverview } from "@/lib/analytics/repository";

import {
  comparisonMetric,
  type AdminOverview,
  type AdminOverviewFilters,
} from "./overview";

type CountResult = { count: number | null; error: { message: string } | null };

function requireCount(result: CountResult) {
  if (result.error) throw new Error("Unable to load admin overview");
  return result.count ?? 0;
}

function applyUserFilters(query: any, filters: AdminOverviewFilters): any {
  let next = query;
  if (filters.domain !== "all") {
    next = next.eq("registered_domain", filters.domain);
  }
  if (filters.plan === "free") next = next.eq("subscription_status", "FREE");
  if (filters.plan === "pro") next = next.eq("subscription_status", "PRO");
  if (filters.plan === "premium") {
    next = next.eq("subscription_status", "PREMIUM PRO");
  }
  return next;
}

async function countUsers(
  filters: AdminOverviewFilters,
  options: { from?: string; to?: string; status?: string } = {},
) {
  let query: any = supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true });
  query = applyUserFilters(query, filters);
  if (options.from) query = query.gte("created_at", options.from);
  if (options.to) query = query.lt("created_at", options.to);
  if (options.status) query = query.eq("subscription_status", options.status);
  return requireCount(await query);
}

async function countReadyProfiles(filters: AdminOverviewFilters) {
  let query: any = supabaseAdmin
    .from("users")
    .select("id,dentistries!inner(dentistry_id)", {
      count: "exact",
      head: true,
    });
  query = applyUserFilters(query, filters)
    .not("dentistries.about_title", "is", null)
    .neq("dentistries.about_title", "");
  return requireCount(await query);
}

export async function getAdminOverview(
  filters: AdminOverviewFilters,
  now = new Date(),
): Promise<AdminOverview> {
  const rangeStart = new Date(
    now.getTime() - filters.days * 24 * 60 * 60 * 1000,
  );
  const previousStart = new Date(
    rangeStart.getTime() - filters.days * 24 * 60 * 60 * 1000,
  );
  const analyticsStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  analyticsStart.setUTCDate(analyticsStart.getUTCDate() - filters.days + 1);
  const analyticsPreviousEnd = new Date(analyticsStart);
  analyticsPreviousEnd.setUTCDate(analyticsPreviousEnd.getUTCDate() - 1);
  const analyticsPreviousStart = new Date(analyticsPreviousEnd);
  analyticsPreviousStart.setUTCDate(
    analyticsPreviousStart.getUTCDate() - filters.days + 1,
  );
  const analyticsFilters = {
    ...(filters.plan === "free"
      ? { plan: "FREE" as const }
      : filters.plan === "pro"
        ? { plan: "PRO" as const }
        : filters.plan === "premium"
          ? { plan: "PREMIUM PRO" as const }
          : {}),
    ...(filters.domain === "all" ? {} : { registeredDomain: filters.domain }),
  };
  const [
    total,
    signups,
    previousSignups,
    free,
    pro,
    premium,
    ready,
    analytics,
    previousAnalytics,
  ] = await Promise.all([
    countUsers(filters),
    countUsers(filters, { from: rangeStart.toISOString() }),
    countUsers(filters, {
      from: previousStart.toISOString(),
      to: rangeStart.toISOString(),
    }),
    countUsers({ ...filters, plan: "all" }, { status: "FREE" }),
    countUsers({ ...filters, plan: "all" }, { status: "PRO" }),
    countUsers({ ...filters, plan: "all" }, { status: "PREMIUM PRO" }),
    countReadyProfiles(filters),
    readAdminAnalyticsOverview(
      {
        startDate: analyticsStart.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
      },
      analyticsFilters,
    ),
    readAdminAnalyticsOverview(
      {
        startDate: analyticsPreviousStart.toISOString().slice(0, 10),
        endDate: analyticsPreviousEnd.toISOString().slice(0, 10),
      },
      analyticsFilters,
    ),
  ]);

  const views = analytics.reduce((sum, row) => sum + row.profileViews, 0);
  const previousViews = previousAnalytics.reduce(
    (sum, row) => sum + row.profileViews,
    0,
  );
  const outboundActions = analytics.reduce(
    (sum, row) => sum + row.outboundActions,
    0,
  );
  const previousOutboundActions = previousAnalytics.reduce(
    (sum, row) => sum + row.outboundActions,
    0,
  );

  const { count: trialCount, error: trialError } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .gt("trial_end", now.toISOString());
  const { count: expiredCount, error: expiredError } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .neq("subscription_status", "FREE")
    .lt("current_period_end", now.toISOString());

  return {
    filters,
    dataThrough: now.toISOString(),
    users: {
      total,
      signups: comparisonMetric(signups, previousSignups),
      active7Days: null,
      active30Days: null,
      readyProfiles: Math.min(total, ready),
      incompleteProfiles: Math.max(0, total - ready),
    },
    plans: {
      free,
      trial: requireCount({ count: trialCount, error: trialError }),
      paid: pro + premium,
      expired: requireCount({ count: expiredCount, error: expiredError }),
      cancelled: null,
      pastDue: null,
    },
    profileAnalytics: {
      views:
        analytics.length === 0 ? null : comparisonMetric(views, previousViews),
      outboundActions:
        analytics.length === 0
          ? null
          : comparisonMetric(outboundActions, previousOutboundActions),
      uniqueVisitors: null,
      trend: analytics.map((row) => ({
        date: row.eventDate,
        views: row.profileViews,
        outboundActions: row.outboundActions,
      })),
      state: analytics.length === 0 ? "processing" : "available",
    },
    billing: {
      monthlyRecurringRevenue: null,
      trialToPaidRate: null,
      state: "unavailable",
    },
    operations: {
      failedOperations: null,
      pendingReports: null,
      breachedSla: null,
      state: "unavailable",
    },
  };
}
