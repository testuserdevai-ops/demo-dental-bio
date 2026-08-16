import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const userId = "00000000-0000-4000-8000-000000000801";
const resolveDashboardIdentity = mock(async () => ({
  scope: { effectiveUserId: userId, username: "appearance-owner" },
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
  draft: {
    saved: current,
    effective: current,
    resolutionReason: "valid" as const,
    revision: 4,
    updatedAt: null,
  },
}));
const saveProfilePresentationDraft = mock(async (input: any) => ({
  saved: input.configuration,
  effective: input.configuration,
  resolutionReason: "valid" as const,
  revision: input.expectedRevision + 1,
  updatedAt: null,
}));
const publishProfilePresentation = mock(async () => ({
  configuration: current,
  revision: 3,
  publishedAt: "2026-08-12T00:00:00.000Z",
}));
const invalidatePublicProfileCache = mock(() => undefined);
const invalidatePublicProfileIdentityCache = mock(() => undefined);

class ProfilePresentationPersistenceError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/profile-presentation/repository", () => ({
  getProfilePresentationState,
  publishProfilePresentation,
  saveProfilePresentationDraft,
  ProfilePresentationPersistenceError,
}));
mock.module("@/lib/public-profile/cache-invalidation", () => ({
  invalidatePublicProfileCache,
  invalidatePublicProfileIdentityCache,
}));

const { saveAppearanceChoice } = await import("./actions");

describe("saveAppearanceChoice", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockClear();
    getProfilePresentationState.mockClear();
    saveProfilePresentationDraft.mockReset();
    publishProfilePresentation.mockClear();
    invalidatePublicProfileCache.mockClear();
    invalidatePublicProfileIdentityCache.mockClear();
    saveProfilePresentationDraft.mockImplementation(async (input: any) => ({
      saved: input.configuration,
      effective: input.configuration,
      resolutionReason: "valid" as const,
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
      entitlement: { tier: "pro" },
    });
    expect(publishProfilePresentation).not.toHaveBeenCalled();
  });

  it("server-authorizes the selected target and keeps it in the next route", async () => {
    const targetUserId = "22222222-2222-4222-8222-222222222222";
    const result = await saveAppearanceChoice({
      step: "theme",
      expectedRevision: 4,
      themeId: "warm-care",
      templateId: "direct-booking",
      targetUserId,
    });

    expect(resolveDashboardIdentity).toHaveBeenCalledWith(targetUserId);
    expect(result).toMatchObject({
      ok: true,
      data: {
        nextHref: `/onboarding/appearance?step=template&userId=${targetUserId}`,
      },
    });
    expect(saveProfilePresentationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ userId }),
    );
  });

  it("uses the safe layout and empty controlled answers when template changes", async () => {
    const result = await saveAppearanceChoice({
      step: "template",
      expectedRevision: 4,
      themeId: "warm-care",
      templateId: "services-catalogue",
      confirmTemplateAnswerReset: true,
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
    expect(publishProfilePresentation).toHaveBeenCalledWith({
      userId,
      expectedDraftRevision: 5,
      expectedPublishedRevision: 2,
    });
    expect(invalidatePublicProfileCache).toHaveBeenCalledWith({
      profileId: userId,
      feature: "profile",
    });
    expect(invalidatePublicProfileIdentityCache).toHaveBeenCalledWith([
      "appearance-owner",
    ]);
  });

  it("requires server-side confirmation before clearing template answers", async () => {
    const result = await saveAppearanceChoice({
      step: "template",
      expectedRevision: 4,
      themeId: "warm-care",
      templateId: "services-catalogue",
      confirmTemplateAnswerReset: false,
    });

    expect(result).toEqual({
      ok: false,
      code: "TEMPLATE_SWITCH_CONFIRMATION_REQUIRED",
      formError:
        "Confirm that you want to clear the saved setup answers for the current template. Your profile content will stay unchanged.",
    });
    expect(saveProfilePresentationDraft).not.toHaveBeenCalled();
  });

  it("retains answers when the same template is saved", async () => {
    await saveAppearanceChoice({
      step: "template",
      expectedRevision: 4,
      themeId: "warm-care",
      templateId: "direct-booking",
      confirmTemplateAnswerReset: false,
    });

    expect(saveProfilePresentationDraft).toHaveBeenCalledWith({
      userId,
      expectedRevision: 4,
      configuration: current,
      entitlement: { tier: "pro" },
    });
  });

  it("allows a first template choice without a confirmation when no answers exist", async () => {
    const emptySource = { ...current, answers: {} };
    getProfilePresentationState.mockResolvedValueOnce({
      entitlement: { tier: "pro" },
      published: {
        saved: emptySource,
        effective: emptySource,
        revision: 2,
        publishedAt: null,
      },
      draft: {
        saved: emptySource,
        effective: emptySource,
        resolutionReason: "valid",
        revision: 4,
        updatedAt: null,
      },
    } as any);

    const result = await saveAppearanceChoice({
      step: "template",
      expectedRevision: 4,
      themeId: "warm-care",
      templateId: "services-catalogue",
      confirmTemplateAnswerReset: false,
    });

    expect(result.ok).toBe(true);
    expect(saveProfilePresentationDraft).toHaveBeenCalledTimes(1);
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
      confirmTemplateAnswerReset: true,
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

  it("normalizes a downgraded draft before saving an available theme", async () => {
    const premiumDraft = {
      schemaVersion: 1 as const,
      templateId: "cosmetic-transformation" as const,
      themeId: "premium-contrast" as const,
      layoutVariant: "hero-overlap" as const,
      answers: {},
    };
    getProfilePresentationState.mockResolvedValueOnce({
      entitlement: { tier: "free" },
      published: {
        saved: premiumDraft,
        effective: premiumDraft,
        revision: 2,
        publishedAt: null,
      },
      draft: {
        saved: premiumDraft,
        effective: {
          ...premiumDraft,
          themeId: "clinical-light",
          layoutVariant: "classic-stack",
        },
        resolutionReason: "entitlement-fallback",
        revision: 6,
        updatedAt: null,
      },
    } as any);

    await saveAppearanceChoice({
      step: "theme",
      expectedRevision: 6,
      themeId: "warm-care",
      templateId: "cosmetic-transformation",
    });

    expect(saveProfilePresentationDraft).toHaveBeenCalledWith({
      userId,
      expectedRevision: 6,
      configuration: {
        ...premiumDraft,
        themeId: "warm-care",
        layoutVariant: "classic-stack",
      },
      entitlement: { tier: "free" },
    });
  });
});
