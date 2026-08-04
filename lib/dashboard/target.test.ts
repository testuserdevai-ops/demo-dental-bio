import { describe, expect, it } from "bun:test";
import { dashboardTargetHintFromSearchParams } from "./target";
import { dashboardTargetHintFromHeaders } from "./target";
import { dashboardTargetTransitionRequiresDocumentNavigation } from "./target";

const targetId = "22222222-2222-4222-8222-222222222222";

describe("dashboardTargetHintFromSearchParams", () => {
  it("reads the dashboard target from a request search parameter", () => {
    expect(
      dashboardTargetHintFromSearchParams(
        new URLSearchParams(`userId=${targetId}`),
      ),
    ).toBe(targetId);
  });

  it("preserves malformed hints for resolveDashboardIdentity to reject", () => {
    expect(
      dashboardTargetHintFromSearchParams(
        new URLSearchParams("userId=not-a-uuid"),
      ),
    ).toBe("not-a-uuid");
  });

  it("uses the decoded request value rather than a URL transport header", () => {
    expect(
      dashboardTargetHintFromSearchParams(
        new URLSearchParams("userId=%252Fadmin"),
      ),
    ).toBe("%2Fadmin");
  });

  it("returns null when the request has no target hint", () => {
    expect(
      dashboardTargetHintFromSearchParams(new URLSearchParams()),
    ).toBeNull();
  });

  it("accepts only the controlled dashboard target header", () => {
    expect(
      dashboardTargetHintFromHeaders(
        new Headers({
          "x-dashboard-target-user-id": targetId,
          "x-next-url": `https://attacker.test/dashboard?userId=${targetId}`,
          "next-url": `https://attacker.test/dashboard?userId=${targetId}`,
        }),
      ),
    ).toBe(targetId);
  });

  it("does not fall back to undocumented URL headers", () => {
    expect(
      dashboardTargetHintFromHeaders(
        new Headers({
          "x-next-url": `https://attacker.test/dashboard?userId=${targetId}`,
          "next-url": `https://attacker.test/dashboard?userId=${targetId}`,
        }),
      ),
    ).toBeNull();
  });

  it("requires a document navigation when the dashboard target changes", () => {
    expect(
      dashboardTargetTransitionRequiresDocumentNavigation(
        "11111111-1111-4111-8111-111111111111",
        targetId,
      ),
    ).toBe(true);
    expect(
      dashboardTargetTransitionRequiresDocumentNavigation(targetId, targetId),
    ).toBe(false);
  });
});
