import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type AdminOverviewMetrics = {
  allUsers: number;
  paidUsers: number;
  verifiedProfiles: number;
  newUsersLast30Days: number;
};

export type AdminOverviewMetricDependencies = {
  countAllUsers(): Promise<number>;
  countPaidUsers(): Promise<number>;
  countVerifiedProfiles(): Promise<number>;
  countUsersCreatedSince(timestamp: string): Promise<number>;
};

type CountResult = { count: number | null; error: { message: string } | null };

function requireCount(result: CountResult, label: string) {
  if (result.error) {
    throw new Error(`Unable to count ${label}: ${result.error.message}`);
  }
  return result.count ?? 0;
}

const productionDependencies: AdminOverviewMetricDependencies = {
  async countAllUsers() {
    return requireCount(
      await supabaseAdmin.from("users").select("id", {
        count: "exact",
        head: true,
      }),
      "users",
    );
  },
  async countPaidUsers() {
    return requireCount(
      await supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .in("subscription_status", ["PRO", "PREMIUM PRO"]),
      "paid users",
    );
  },
  async countVerifiedProfiles() {
    return requireCount(
      await supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("isVerified", true),
      "verified profiles",
    );
  },
  async countUsersCreatedSince(timestamp) {
    return requireCount(
      await supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("created_at", timestamp),
      "new users",
    );
  },
};

export async function getAdminOverviewMetricsFromDependencies(
  dependencies: AdminOverviewMetricDependencies,
  now: Date,
): Promise<AdminOverviewMetrics> {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 30);

  const [allUsers, paidUsers, verifiedProfiles, newUsersLast30Days] =
    await Promise.all([
      dependencies.countAllUsers(),
      dependencies.countPaidUsers(),
      dependencies.countVerifiedProfiles(),
      dependencies.countUsersCreatedSince(start.toISOString()),
    ]);

  return { allUsers, paidUsers, verifiedProfiles, newUsersLast30Days };
}

export async function getAdminOverviewMetrics() {
  return getAdminOverviewMetricsFromDependencies(
    productionDependencies,
    new Date(),
  );
}
