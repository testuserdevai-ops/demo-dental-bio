import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const userId = "00000000-0000-4000-8000-000000000801";
const resolveDashboardIdentity = mock(async () => ({
  scope: { effectiveUserId: userId },
}));

const current = {
  schemaVersion: 1 as const,
  templateId: "direct-booking" as const,
  themeId: "warm-care" as const,
  layoutVariant: "classic-stack" as const,
  answers: { primaryAction: "booking" as const },
};

const getProfilePresentationState = mock(async () => ({
  entitlement: { tier: "pro" as const },
  published: {
    saved: current,
    effective: current,
    revision: 2,
    publishedAt: null,
  },
  draft: { configuration: current, revision: 4, updatedAt: null },
}));
const saveProfilePresentationDraft = mock(async (input: any) => ({
  configuration: input.configuration,
  revision: input.expectedRevision + 1,
  updatedAt: null,
}));

class ProfilePresentationPersistenceError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/profile-presentation/repository", () => ({
  getProfilePresentationState,
  saveProfilePresentationDraft,
  ProfilePresentationPersistenceError,
}));

const { saveAppearanceChoice } = await import("./actions");

describe("saveAppearanceChoice", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockClear();
    getProfilePresentationState.mockClear();
    saveProfilePresentationDraft.mockReset();
    saveProfilePresentationDraft.mockImplementation(async (input: any) => ({
      configuration: input.configuration,
      revision: input.expectedRevision + 1,
      updatedAt: null,
    }));
  });

  it("saves theme progress without publishing or changing template answers", async () => {
    const result = await saveAppearanceChoice({
      step: "theme",
      expectedRevision: 4,
      themeId: "editorial-expert",
      templateId: "direct-booking",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        configuration: { ...current, themeId: "editorial-expert" },
        revision: 5,
        nextHref: "/onboarding/appearance?step=template",
      },
    });
    expect(saveProfilePresentationDraft).toHaveBeenCalledWith({
      userId,
      expectedRevision: 4,
      configuration: { ...current, themeId: "editorial-expert" },
    });
  });

  it("uses the safe layout and empty controlled answers when template changes", async () => {
    const result = await saveAppearanceChoice({
      step: "template",
      expectedRevision: 4,
      themeId: "warm-care",
      templateId: "services-catalogue",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        configuration: {
          ...current,
          templateId: "services-catalogue",
          answers: {},
        },
        revision: 5,
        nextHref: "/onboarding/questions?template=services-catalogue",
      },
    });
  });

  it("rejects unknown controlled choices before authentication or persistence", async () => {
    const result = await saveAppearanceChoice({
      step: "theme",
      expectedRevision: 0,
      themeId: "owner-custom-purple",
      templateId: "basic",
    });

    expect(result.ok).toBe(false);
    expect(resolveDashboardIdentity).not.toHaveBeenCalled();
    expect(saveProfilePresentationDraft).not.toHaveBeenCalled();
  });

  it("returns an actionable conflict and preserves the browser selection", async () => {
    saveProfilePresentationDraft.mockRejectedValueOnce(
      new ProfilePresentationPersistenceError("CONFLICT"),
    );

    const result = await saveAppearanceChoice({
      step: "template",
      expectedRevision: 4,
      themeId: "warm-care",
      templateId: "basic",
    });

    expect(result).toEqual({
      ok: false,
      code: "CONFLICT",
      formError:
        "These choices changed in another tab. Reload the saved choices before continuing.",
    });
  });

  it("surfaces server plan validation without treating a locked option as saved", async () => {
    saveProfilePresentationDraft.mockRejectedValueOnce(
      new ProfilePresentationPersistenceError("INVALID_CONFIGURATION"),
    );

    const result = await saveAppearanceChoice({
      step: "theme",
      expectedRevision: 4,
      themeId: "premium-contrast",
      templateId: "direct-booking",
    });

    expect(result).toEqual({
      ok: false,
      code: "INVALID_CHOICE",
      formError:
        "That appearance combination is no longer available. Review your choices and try again.",
    });
  });
});

