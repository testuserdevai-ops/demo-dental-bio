import { beforeEach, describe, expect, it, mock } from "bun:test";

const rpc = mock(
  async (): Promise<{
    data: unknown;
    error: { message: string } | null;
  }> => ({ data: payload(), error: null }),
);
const createServerSupabaseClient = mock(async () => ({ rpc }));

mock.module("server-only", () => ({}));
mock.module("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

const { getAdminPlatformFunnel } = await import("./platform-funnel-repository");

function payload() {
  return {
    schemaVersion: 1,
    cohortSize: 1,
    stages: [
      "registered",
      "verified",
      "onboarding_completed",
      "profile_published",
      "first_view",
      "first_action",
    ].map((id) => ({
      id,
      label: id,
      count: 1,
      medianMinutesFromPrevious: id === "registered" ? null : 2,
    })),
    registrationCoverage: { completed: 1, cohort: 1 },
    onboardingStarted: 1,
    completionDistribution: ["0", "1-25", "26-50", "51-74", "75-99", "100"].map(
      (id) => ({ id, label: id, count: id === "100" ? 1 : 0 }),
    ),
    trafficGaps: {
      analyticsCoverageStartedAt: "2026-08-01T00:00:00.000Z",
      zeroTraffic: 0,
      zeroTrafficEligible: 1,
      viewedNoAction: 0,
    },
    moduleAdoption: [{ id: "links", label: "Links", count: 1 }],
    unavailable: [{ id: "paid", reason: "No paid timestamp." }],
  };
}

describe("admin platform funnel repository", () => {
  beforeEach(() => {
    rpc.mockClear();
    createServerSupabaseClient.mockClear();
  });

  it("passes every controlled filter through one authenticated RPC", async () => {
    const model = await getAdminPlatformFunnel({
      startDate: "2026-08-01",
      endDate: "2026-08-12",
      plan: "premium",
      domain: "dental.bio",
      cohort: "referred",
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_admin_platform_funnel", {
      p_start_date: "2026-08-01",
      p_end_date: "2026-08-12",
      p_plan: "PREMIUM PRO",
      p_registered_domain: "dental.bio",
      p_cohort: "referred",
    });
    expect(model.stages.at(-1)?.cohortRate).toBe(100);
  });

  it("maps all filters to SQL nulls without losing the selected date range", async () => {
    await getAdminPlatformFunnel({
      startDate: "2026-08-01",
      endDate: "2026-08-12",
      plan: "all",
      domain: "all",
      cohort: "all",
    });

    expect(rpc).toHaveBeenCalledWith("get_admin_platform_funnel", {
      p_start_date: "2026-08-01",
      p_end_date: "2026-08-12",
      p_plan: null,
      p_registered_domain: null,
      p_cohort: "all",
    });
  });

  it("fails closed on an RPC or payload contract error", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    await expect(
      getAdminPlatformFunnel({
        startDate: "2026-08-01",
        endDate: "2026-08-12",
        plan: "all",
        domain: "all",
        cohort: "all",
      }),
    ).rejects.toThrow("Unable to load the platform funnel");

    rpc.mockResolvedValueOnce({ data: { schemaVersion: 2 }, error: null });
    await expect(
      getAdminPlatformFunnel({
        startDate: "2026-08-01",
        endDate: "2026-08-12",
        plan: "all",
        domain: "all",
        cohort: "all",
      }),
    ).rejects.toThrow("Platform funnel data was not recognized");
  });
});
