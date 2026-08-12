import { describe, expect, test } from "bun:test";

import {
  getAnalyticsEntityDimensions,
  hashAnalyticsIdentifier,
} from "./storage-mapping";

describe("analytics storage mapping", () => {
  test("maps controlled entity and group IDs without retaining labels", () => {
    expect(
      getAnalyticsEntityDimensions({
        type: "link_click",
        linkId: "33333333-3333-4333-8333-333333333333",
        groupId: "44444444-4444-4444-8444-444444444444",
      }),
    ).toEqual({
      entityUuid: "33333333-3333-4333-8333-333333333333",
      entityBigint: null,
      groupUuid: "44444444-4444-4444-8444-444444444444",
      groupBigint: null,
      actionDimension: null,
    });
    expect(
      getAnalyticsEntityDimensions({
        type: "blog_click",
        blogId: 42,
        groupId: 7,
      }),
    ).toMatchObject({ entityBigint: 42, groupBigint: 7 });
  });

  test("maps only allow-listed action dimensions", () => {
    expect(
      getAnalyticsEntityDimensions({
        type: "cta_click",
        ctaType: "booking",
      }).actionDimension,
    ).toBe("booking");
    expect(
      getAnalyticsEntityDimensions({
        type: "social_click",
        platform: "instagram",
      }).actionDimension,
    ).toBe("instagram");
  });

  test("hashes identifiers deterministically with domain separation", () => {
    const secret = "test-secret-that-is-not-production";
    const visitor = hashAnalyticsIdentifier("visitor", "opaque-id", secret);
    expect(visitor).toMatch(/^[0-9a-f]{64}$/);
    expect(visitor).toBe(
      hashAnalyticsIdentifier("visitor", "opaque-id", secret),
    );
    expect(visitor).not.toBe(
      hashAnalyticsIdentifier("session", "opaque-id", secret),
    );
    expect(visitor).not.toContain("opaque-id");
  });
});
