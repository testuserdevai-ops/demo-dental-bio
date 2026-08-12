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
    const model = await getOwnerAnalyticsDashboard(
      "00000000-0000-4000-8000-000000000001",
      "free",
      { tab: "overview", range: "7d", timezone: "UTC" },
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
          },
        ]),
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
      { tab: "overview", range: "7d", timezone: "UTC" },
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
          },
        ]),
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
  });
});
