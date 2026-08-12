import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const resolveDashboardIdentity = mock(async () => ({
  scope: {
    effectiveUserId: "00000000-0000-4000-8000-000000000801",
  },
  shell: { subscriptionStatus: "PREMIUM PRO" },
}));
const recordOwnerAnalyticsExport = mock(
  async (_input: {
    profileId: string;
    dataset: string;
    timezone: string;
    rowCount: number;
  }) => "00000000-0000-4000-8000-000000000802",
);
const readOwnerCampaignPerformance = mock(async () => [
  {
    campaignId: null,
    source: "google",
    medium: "cpc",
    campaign: "booking",
    profileViews: 5,
    uniqueVisitors: 4,
    clicks: 2,
    uniqueClickers: 2,
    ctr: 50,
    conversions: 1,
    uniqueConverters: 1,
    conversionRate: 25,
    lastConversionAt: "2026-08-12T10:00:00.000Z",
  },
]);

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/analytics/repository", () => ({
  readOwnerAnalyticsAudience: mock(),
  readOwnerAnalyticsContent: mock(),
  readOwnerAnalyticsSummary: mock(),
  readOwnerAnalyticsTotals: mock(),
  readOwnerCampaignPerformance,
  readOwnerConversionGoalPerformance: mock(),
  readOwnerConversionSummary: mock(),
  readOwnerConversionTotals: mock(),
  recordOwnerAnalyticsExport,
}));

const { GET } = await import("./route");

describe("analytics export route", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockClear();
    recordOwnerAnalyticsExport.mockClear();
  });

  it("uses active filters, returns private CSV, and audits the download", async () => {
    const response = await GET(
      new Request(
        "https://dental.bio/api/dashboard/analytics/export?dataset=campaigns&range=7d&timezone=UTC",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toContain("google,cpc,booking");
    expect(recordOwnerAnalyticsExport).toHaveBeenCalledTimes(1);
    expect(recordOwnerAnalyticsExport.mock.calls[0]?.[0]).toMatchObject({
      profileId: "00000000-0000-4000-8000-000000000801",
      dataset: "campaigns",
      timezone: "UTC",
      rowCount: 1,
    });
  });

  it("fails closed for a non-Premium owner", async () => {
    resolveDashboardIdentity.mockResolvedValueOnce({
      scope: { effectiveUserId: "00000000-0000-4000-8000-000000000801" },
      shell: { subscriptionStatus: "PRO" },
    });
    const response = await GET(
      new Request(
        "https://dental.bio/api/dashboard/analytics/export?dataset=overview&range=7d&timezone=UTC",
      ),
    );
    expect(response.status).toBe(403);
    expect(recordOwnerAnalyticsExport).not.toHaveBeenCalled();
  });
});
