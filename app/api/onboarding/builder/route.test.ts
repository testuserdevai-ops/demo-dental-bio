import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const scope = {
  effectiveUserId: "00000000-0000-4000-8000-000000000801",
  dentistryId: "00000000-0000-4000-8000-000000000802",
  username: "question-owner",
  canManageSubscription: true,
};
const resolveDashboardIdentity = mock(async () => ({ scope }));
const getOnboardingBuilderData = mock(async () => ({ profile: "safe-data" }));

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/app/onboarding/questions/_lib/builder-data", () => ({
  onboardingBuilderIds: [
    "profile",
    "socials",
    "treatment",
    "location",
    "review",
    "gallery",
    "product",
    "link",
    "video",
  ] as const,
  getOnboardingBuilderData,
}));

const { GET } = await import("./route");

describe("GET /api/onboarding/builder", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockClear();
    getOnboardingBuilderData.mockClear();
  });

  it("rejects uncontrolled builders before authentication", async () => {
    const response = await GET(
      new Request("http://localhost/api/onboarding/builder?builder=private"),
    );

    expect(response.status).toBe(400);
    expect(resolveDashboardIdentity).not.toHaveBeenCalled();
  });

  it("authorizes the target and returns only the requested builder data", async () => {
    const targetUserId = "00000000-0000-4000-8000-000000000899";
    const response = await GET(
      new Request(
        `http://localhost/api/onboarding/builder?builder=socials&targetUserId=${targetUserId}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ profile: "safe-data" });
    expect(resolveDashboardIdentity).toHaveBeenCalledWith(targetUserId);
    expect(getOnboardingBuilderData).toHaveBeenCalledWith("socials", scope);
  });
});
