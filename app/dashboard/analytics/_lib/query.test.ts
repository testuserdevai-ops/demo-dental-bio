import { describe, expect, it } from "bun:test";
import { parseAnalyticsQuery, rangesForPlan } from "./query";

describe("analytics query policy", () => {
  it("keeps Free ranges server-shaped and rejects gated URL ranges", () => {
    expect(rangesForPlan("free")).toEqual(["7d", "lifetime"]);
    expect(
      parseAnalyticsQuery({ tab: "audience", range: "90d" }, "free"),
    ).toEqual({
      tab: "audience",
      range: "7d",
      timezone: "Africa/Cairo",
    });
  });

  it("accepts stable tabs and plan-authorized ranges", () => {
    expect(
      parseAnalyticsQuery({ tab: "content", range: "90d" }, "pro"),
    ).toMatchObject({ tab: "content", range: "90d" });
    expect(
      parseAnalyticsQuery({ tab: "unknown", range: "365d" }, "premium"),
    ).toMatchObject({ tab: "overview", range: "365d" });
  });
});
