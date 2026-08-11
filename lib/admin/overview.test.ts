import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));

const { getAdminOverviewMetricsFromDependencies } = await import("./overview");

describe("admin overview metrics", () => {
  it("collects authoritative counts using a UTC 30-day boundary", async () => {
    const countUsersCreatedSince = mock(async () => 7);

    await expect(
      getAdminOverviewMetricsFromDependencies(
        {
          countAllUsers: async () => 42,
          countPaidUsers: async () => 9,
          countVerifiedProfiles: async () => 18,
          countUsersCreatedSince,
        },
        new Date("2026-08-12T12:00:00.000Z"),
      ),
    ).resolves.toEqual({
      allUsers: 42,
      paidUsers: 9,
      verifiedProfiles: 18,
      newUsersLast30Days: 7,
    });

    expect(countUsersCreatedSince).toHaveBeenCalledWith(
      "2026-07-13T12:00:00.000Z",
    );
  });

  it("does not replace a failed authoritative count with a misleading zero", async () => {
    await expect(
      getAdminOverviewMetricsFromDependencies(
        {
          countAllUsers: async () => 42,
          countPaidUsers: async () => {
            throw new Error("database unavailable");
          },
          countVerifiedProfiles: async () => 18,
          countUsersCreatedSince: async () => 7,
        },
        new Date("2026-08-12T12:00:00.000Z"),
      ),
    ).rejects.toThrow("database unavailable");
  });
});
