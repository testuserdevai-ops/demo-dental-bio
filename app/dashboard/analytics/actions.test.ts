import { beforeEach, describe, expect, it, mock } from "bun:test";

const rpc = mock(async () => ({ data: "Africa/Cairo", error: null }));
const revalidatePath = mock();
const resolveDashboardIdentity = mock(async () => ({
  scope: {
    effectiveUserId: "00000000-0000-4000-8000-000000000001",
  },
}));

mock.module("next/cache", () => ({ revalidatePath }));
mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc }),
}));

const { saveAnalyticsTimezone } = await import("./actions");

describe("analytics timezone action", () => {
  beforeEach(() => {
    rpc.mockClear();
    revalidatePath.mockClear();
    resolveDashboardIdentity.mockClear();
  });

  it("persists only through the owner-authorized RPC", async () => {
    expect(await saveAnalyticsTimezone(undefined, "Africa/Cairo")).toEqual({
      ok: true,
      timezone: "Africa/Cairo",
    });
    expect(rpc).toHaveBeenCalledWith("set_owner_analytics_timezone", {
      p_profile_id: "00000000-0000-4000-8000-000000000001",
      p_timezone: "Africa/Cairo",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/analytics");
  });

  it("rejects malformed input before identity or database work", async () => {
    expect(await saveAnalyticsTimezone(undefined, "")).toEqual({
      ok: false,
      message: "Choose a valid reporting timezone.",
    });
    expect(resolveDashboardIdentity).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
