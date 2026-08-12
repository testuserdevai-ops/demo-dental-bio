import { describe, expect, it } from "bun:test";
import { parseAnalyticsQuery, rangesForPlan } from "./query";

describe("analytics query policy", () => {
  it("keeps Free ranges server-shaped and rejects gated URL ranges", () => {
    expect(rangesForPlan("free")).toEqual(["7d"]);
    expect(
      parseAnalyticsQuery({ tab: "audience", range: "90d" }, "free"),
    ).toEqual({
      tab: "audience",
      range: "7d",
      timezone: "UTC",
      content: null,
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

  it("accepts only controlled stable content drill-down identifiers", () => {
    expect(
      parseAnalyticsQuery(
        {
          tab: "content",
          contentAction: "link_click",
          contentId: "00000000-0000-4000-8000-000000000006",
        },
        "pro",
        "Africa/Cairo",
      ),
    ).toMatchObject({
      timezone: "Africa/Cairo",
      content: {
        actionType: "link_click",
        entityId: "00000000-0000-4000-8000-000000000006",
      },
    });
    expect(
      parseAnalyticsQuery(
        {
          contentAction: "free_form_event",
          contentId: "https://private.example/path",
        },
        "pro",
      ).content,
    ).toBeNull();
  });
});
