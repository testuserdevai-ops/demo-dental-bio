import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { analyticsPlanFromSubscription, getOwnerAnalyticsDashboard } =
  await import("./repository");

describe("owner analytics repository seam", () => {
  it("maps subscription status to the authoritative plan", () => {
    expect(analyticsPlanFromSubscription("FREE")).toBe("free");
    expect(analyticsPlanFromSubscription("PRO")).toBe("pro");
    expect(analyticsPlanFromSubscription("PREMIUM PRO")).toBe("premium");
  });

  it("does not fabricate analytics while the aggregate source is empty", async () => {
    const model = await getOwnerAnalyticsDashboard(
      "00000000-0000-4000-8000-000000000001",
      "free",
      { tab: "overview", range: "7d", timezone: "Africa/Cairo" },
    );
    expect(model.state).toBe("empty");
    expect(model.metrics).toEqual([]);
    expect(model.trend).toEqual([]);
    expect(model.referrers).toBeUndefined();
    expect(model.funnel).toBeUndefined();
  });
});
