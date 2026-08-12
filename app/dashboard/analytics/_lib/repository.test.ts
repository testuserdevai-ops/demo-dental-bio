import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const {
  analyticsPlanFromSubscription,
  getOwnerAnalyticsDashboard,
  resolveAnalyticsDateRanges,
} = await import("./repository");

describe("owner analytics repository seam", () => {
  it("maps subscription status to the authoritative plan", () => {
    expect(analyticsPlanFromSubscription("FREE")).toBe("free");
    expect(analyticsPlanFromSubscription("PRO")).toBe("pro");
    expect(analyticsPlanFromSubscription("PREMIUM PRO")).toBe("premium");
  });

  it("reconciles exact totals and omits unsupported audience dimensions", async () => {
    const readSummary = mock(async () => [
      {
        eventDate: "2026-08-12",
        profileViews: 5,
        uniqueProfileVisitors: 3,
        outboundActions: 3,
        uniqueActionVisitors: 2,
        conversions: null,
        uniqueConvertingVisitors: null,
      },
    ]);
    const readTotals = mock(async () => ({
      profileViews: 5,
      uniqueProfileVisitors: 3,
      outboundActions: 3,
      uniqueActionVisitors: 2,
      conversions: null,
      uniqueConvertingVisitors: null,
    }));
    const readAudience = mock(async () => ({
      rows: [],
      privacyThreshold: 5 as const,
      geography: {
        available: false as const,
        reason: "not_collected" as const,
      },
    }));
    const model = await getOwnerAnalyticsDashboard(
      "00000000-0000-4000-8000-000000000001",
      "free",
      { tab: "overview", range: "7d", timezone: "UTC", content: null },
      {
        readSummary,
        readTotals,
        readContent: mock(async () => [
          {
            actionType: "link_click",
            section: "links",
            entityUuid: "00000000-0000-4000-8000-000000000006",
            entityBigint: null,
            groupUuid: "00000000-0000-4000-8000-000000000007",
            groupBigint: null,
            actionDimension: null,
            visiblePosition: 2,
            totalEvents: 3,
            uniqueVisitors: 2,
            lastActiveAt: "2026-08-12T17:00:00.000Z",
            contentLabel: "Book a consultation",
            contentDeleted: false,
          },
        ]),
        readAudience,
        now: () => new Date("2026-08-12T18:00:00.000Z"),
      },
    );
    expect(model.state).toBe("ready");
    expect(model.metrics.map(({ id, value }) => [id, value])).toEqual([
      ["views", 5],
      ["uniqueVisitors", 3],
      ["clicks", 3],
      ["clickRate", 66.7],
    ]);
    expect(model.content[0]).toMatchObject({
      clicks: 3,
      uniqueClickers: 2,
      ctr: 66.7,
      position: 2,
      lastActiveAt: "2026-08-12T17:00:00.000Z",
    });
    expect(model.content[0].conversions).toBeUndefined();
    expect(model.referrers).toBeUndefined();
    expect(model.funnel).toBeUndefined();
    expect(readAudience).not.toHaveBeenCalled();
  });

  it("uses an exact bounded UTC range instead of mislabeling retention as lifetime", () => {
    const { current, previous } = resolveAnalyticsDateRanges(
      "7d",
      new Date("2026-08-12T20:15:00.000Z"),
    );
    expect(current).toEqual({
      startDate: "2026-08-06",
      endDate: "2026-08-12",
    });
    expect(previous).toEqual({
      startDate: "2026-07-30",
      endDate: "2026-08-05",
    });
  });

  it("shows one actionable no-contact insight only after enough qualified views", async () => {
    const totals = {
      profileViews: 30,
      uniqueProfileVisitors: 20,
      outboundActions: 0,
      uniqueActionVisitors: 0,
      conversions: 0,
      uniqueConvertingVisitors: 0,
    };
    const model = await getOwnerAnalyticsDashboard(
      "00000000-0000-4000-8000-000000000001",
      "pro",
      { tab: "overview", range: "30d", timezone: "UTC", content: null },
      {
        readSummary: mock(async () => []),
        readTotals: mock(async () => totals),
        readContent: mock(async () => []),
        readAudience: mock(async () => ({
          rows: [],
          privacyThreshold: 5 as const,
          geography: {
            available: false as const,
            reason: "not_collected" as const,
          },
        })),
        now: () => new Date("2026-08-12T18:00:00.000Z"),
      },
    );
    expect(model.insight).toMatchObject({
      id: "no-contact-action",
      actionHref: "/dashboard/profile",
      actionLabel: "Review contact actions",
    });
    expect(model.insight?.description).toContain("30 qualified views");
    expect(model.insight?.description).toContain("untracked route");
  });

  it("shows unavailable identity metrics as unavailable instead of zero", async () => {
    const totals = {
      profileViews: 4,
      uniqueProfileVisitors: null,
      outboundActions: 2,
      uniqueActionVisitors: null,
      conversions: 1,
      uniqueConvertingVisitors: null,
    };
    const model = await getOwnerAnalyticsDashboard(
      "00000000-0000-4000-8000-000000000001",
      "pro",
      { tab: "overview", range: "7d", timezone: "UTC", content: null },
      {
        readSummary: mock(async () => [
          {
            eventDate: "2026-08-12",
            ...totals,
          },
        ]),
        readTotals: mock(async () => totals),
        readContent: mock(async () => [
          {
            actionType: "link_click",
            section: "links",
            entityUuid: "00000000-0000-4000-8000-000000000006",
            entityBigint: null,
            groupUuid: null,
            groupBigint: null,
            actionDimension: null,
            visiblePosition: 1,
            totalEvents: 2,
            uniqueVisitors: null,
            lastActiveAt: "2026-08-12T17:00:00.000Z",
            contentLabel: null,
            contentDeleted: false,
          },
        ]),
        readAudience: mock(async () => ({
          rows: [
            {
              dimensionType: "source" as const,
              dimensionValue: "social",
              totalViews: 6,
              uniqueVisitors: null,
              isSuppressed: false,
            },
            {
              dimensionType: "source" as const,
              dimensionValue: "other",
              totalViews: 5,
              uniqueVisitors: null,
              isSuppressed: true,
            },
            {
              dimensionType: "referrer_domain" as const,
              dimensionValue: "example.test",
              totalViews: 6,
              uniqueVisitors: null,
              isSuppressed: false,
            },
            {
              dimensionType: "device_class" as const,
              dimensionValue: "mobile",
              totalViews: 6,
              uniqueVisitors: null,
              isSuppressed: false,
            },
          ],
          privacyThreshold: 5 as const,
          geography: {
            available: false as const,
            reason: "not_collected" as const,
          },
        })),
        now: () => new Date("2026-08-12T18:00:00.000Z"),
      },
    );
    expect(
      model.metrics.find(({ id }) => id === "uniqueVisitors"),
    ).toMatchObject({ value: null, availability: "unavailable" });
    expect(model.metrics.find(({ id }) => id === "clickRate")).toMatchObject({
      value: null,
      availability: "unavailable",
    });
    expect(model.content[0]).toMatchObject({
      uniqueClickers: null,
      ctr: null,
    });
    expect(model.funnel).toBeUndefined();
    expect(model.referrers).toEqual([
      {
        id: "source:social",
        label: "Social",
        count: 6,
        percentage: 54.5,
      },
      {
        id: "source:other",
        label: "Other",
        count: 5,
        percentage: 45.5,
        availability: "suppressed",
      },
    ]);
    expect(
      model.referrers?.reduce((sum, row) => sum + (row.percentage ?? 0), 0),
    ).toBe(100);
    expect(model.devices?.[0]).toMatchObject({ label: "Mobile", count: 6 });
  });

  it("uses configured goals and exact campaign aggregates for conversions", async () => {
    const totals = {
      profileViews: 10,
      uniqueProfileVisitors: 8,
      outboundActions: 5,
      uniqueActionVisitors: 4,
      conversions: 5,
      uniqueConvertingVisitors: 4,
    };
    const readConversionTotals = mock(async () => ({
      conversions: 2,
      uniqueConverters: 2,
      primaryConversions: 1,
      uniquePrimaryConverters: 1,
    }));
    const model = await getOwnerAnalyticsDashboard(
      "00000000-0000-4000-8000-000000000001",
      "premium",
      { tab: "conversions", range: "7d", timezone: "UTC", content: null },
      {
        readSummary: mock(async () => [
          {
            eventDate: "2026-08-12",
            ...totals,
          },
        ]),
        readTotals: mock(async () => totals),
        readContent: mock(async () => []),
        readAudience: mock(async () => ({
          rows: [],
          privacyThreshold: 5 as const,
          geography: {
            available: false as const,
            reason: "not_collected" as const,
          },
        })),
        readConversionSummary: mock(async () => [
          {
            eventDate: "2026-08-12",
            conversions: 2,
            uniqueConverters: 2,
            primaryConversions: 1,
            uniquePrimaryConverters: 1,
          },
        ]),
        readConversionTotals,
        readGoalPerformance: mock(async () => [
          {
            goalId: "00000000-0000-4000-8000-000000000010",
            goalName: "Booking click",
            eventType: "booking_click",
            entityUuid: null,
            entityBigint: null,
            isPrimary: true,
            enabled: true,
            conversions: 1,
            uniqueConverters: 1,
            lastConversionAt: "2026-08-12T12:00:00.000Z",
          },
        ]),
        readCampaignPerformance: mock(async () => [
          {
            campaignId: null,
            source: "google",
            medium: "cpc",
            campaign: "booking",
            profileViews: 10,
            uniqueVisitors: 8,
            clicks: 5,
            uniqueClickers: 4,
            ctr: 50,
            conversions: 2,
            uniqueConverters: 2,
            conversionRate: 25,
            lastConversionAt: "2026-08-12T12:00:00.000Z",
          },
        ]),
        now: () => new Date("2026-08-12T18:00:00.000Z"),
      },
    );
    expect(model.metrics.find(({ id }) => id === "conversions")?.value).toBe(2);
    expect(
      model.metrics.find(({ id }) => id === "primaryConversionRate")?.value,
    ).toBe(12.5);
    expect(model.trend[0]?.conversions).toBe(2);
    expect(model.conversionGoals?.[0]).toMatchObject({
      name: "Booking click",
      conversions: 1,
      conversionRate: 12.5,
    });
    expect(model.campaigns?.[0]).toMatchObject({
      source: "google",
      medium: "cpc",
      conversions: 2,
      conversionRate: 25,
    });
  });
});
