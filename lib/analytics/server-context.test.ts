import { describe, expect, test } from "bun:test";
import { resolveRequestedAnalyticsRenderContext } from "./render-context";

const profileId = "22222222-2222-4222-8222-222222222222";

describe("resolveRequestedAnalyticsRenderContext", () => {
  test("keeps ordinary traffic public", () => {
    expect(
      resolveRequestedAnalyticsRenderContext(undefined, profileId, null),
    ).toEqual({
      kind: "public",
    });
  });

  test("fails closed when requested preview/test contexts lack proof", () => {
    expect(
      resolveRequestedAnalyticsRenderContext("preview", profileId, null),
    ).toEqual({
      kind: "excluded",
      reason: "unverified_preview",
    });
    expect(
      resolveRequestedAnalyticsRenderContext("test", profileId, null),
    ).toEqual({
      kind: "excluded",
      reason: "unverified_test",
    });
  });

  test("distinguishes authenticated profile-owner and admin preview", () => {
    expect(
      resolveRequestedAnalyticsRenderContext("preview", profileId, {
        id: profileId,
        role: "user",
      }),
    ).toEqual({
      kind: "preview",
      verification: "authenticated_profile_owner",
    });
    expect(
      resolveRequestedAnalyticsRenderContext("preview", profileId, {
        id: "33333333-3333-4333-8333-333333333333",
        role: "admin",
      }),
    ).toEqual({
      kind: "admin_preview",
      verification: "authenticated_admin",
    });
  });
});
