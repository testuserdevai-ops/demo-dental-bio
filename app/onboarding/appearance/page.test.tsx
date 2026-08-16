import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const resolveDashboardIdentity = mock(async () => ({
  scope: { effectiveUserId: "00000000-0000-4000-8000-000000000801" },
  profileIdentity: {
    title: "Dr",
    firstName: "Alex",
    lastName: "Morgan",
    position: "Cosmetic dentist",
  },
}));

const basic = {
  schemaVersion: 1 as const,
  templateId: "basic" as const,
  themeId: "clinical-light" as const,
  layoutVariant: "classic-stack" as const,
  answers: {},
};
let presentationState: any = {
  entitlement: { tier: "free" as const },
  published: {
    saved: basic,
    effective: basic,
    revision: 0,
    publishedAt: null,
  },
  draft: {
    saved: null,
    effective: basic,
    resolutionReason: "missing" as const,
    revision: 0,
    updatedAt: null,
  },
};
const getProfilePresentationState = mock(async () => presentationState);

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/profile-presentation/repository", () => ({
  getProfilePresentationState,
}));
mock.module("./_components/AppearanceChooser", () => ({
  AppearanceChooser: (props: Record<string, unknown>) => ({
    type: "appearance-chooser",
    props,
  }),
}));

const { default: AppearanceOnboardingPage } = await import("./page");

describe("AppearanceOnboardingPage", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockReset();
    resolveDashboardIdentity.mockResolvedValue({
      scope: { effectiveUserId: "00000000-0000-4000-8000-000000000801" },
      profileIdentity: {
        title: "Dr",
        firstName: "Alex",
        lastName: "Morgan",
        position: "Cosmetic dentist",
      },
    });
    getProfilePresentationState.mockClear();
    presentationState = {
      entitlement: { tier: "free" },
      published: {
        saved: basic,
        effective: basic,
        revision: 0,
        publishedAt: null,
      },
      draft: {
        saved: null,
        effective: basic,
        resolutionReason: "missing",
        revision: 0,
        updatedAt: null,
      },
    };
  });

  it("canonicalizes a direct first visit to the color-theme step", async () => {
    await expect(
      AppearanceOnboardingPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/onboarding/appearance?step=theme");
  });

  it("resumes a saved private draft at the template step", async () => {
    presentationState.draft = {
      saved: basic,
      effective: basic,
      resolutionReason: "valid",
      revision: 3,
      updatedAt: null,
    };

    await expect(
      AppearanceOnboardingPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/onboarding/appearance?step=template");
  });

  it("lets an existing owner change template from the published safe appearance", async () => {
    const element = await AppearanceOnboardingPage({
      searchParams: Promise.resolve({ step: "template" }),
    });

    expect(element.props).toMatchObject({
      configuration: basic,
      revision: 0,
      step: "template",
    });
  });

  it("redirects an unauthenticated visitor to login", async () => {
    resolveDashboardIdentity.mockRejectedValueOnce(
      new Error("UNAUTHENTICATED"),
    );

    await expect(
      AppearanceOnboardingPage({
        searchParams: Promise.resolve({ step: "theme" }),
      }),
    ).rejects.toThrow("redirect:/login");
    expect(getProfilePresentationState).not.toHaveBeenCalled();
  });

  it("passes the saved revision into the authenticated chooser", async () => {
    presentationState.draft = {
      saved: basic,
      effective: basic,
      resolutionReason: "valid",
      revision: 7,
      updatedAt: null,
    };
    const element = await AppearanceOnboardingPage({
      searchParams: Promise.resolve({ step: "template" }),
    });

    expect(element.props).toMatchObject({
      configuration: basic,
      entitlementTier: "free",
      profile: {
        initials: "AM",
        displayName: "Dr Alex Morgan",
        specialty: "Cosmetic dentist",
        usesFallback: false,
      },
      revision: 7,
      step: "template",
    });
  });

  it("authorizes and preserves an admin-selected profile", async () => {
    const targetUserId = "22222222-2222-4222-8222-222222222222";
    const element = await AppearanceOnboardingPage({
      searchParams: Promise.resolve({ step: "theme", userId: targetUserId }),
    });

    expect(resolveDashboardIdentity).toHaveBeenCalledWith(targetUserId);
    expect(element.props.targetUserId).toBe(targetUserId);
  });

  it("explains a malformed saved draft and resumes from safe defaults", async () => {
    presentationState.draft = {
      saved: null,
      effective: basic,
      resolutionReason: "malformed",
      revision: 9,
      updatedAt: null,
    };

    const element = await AppearanceOnboardingPage({
      searchParams: Promise.resolve({ step: "theme" }),
    });

    expect(element.props.revision).toBe(9);
    expect(element.props.fallbackNotice).toContain("could not be read");
    expect(element.props.fallbackNotice).toContain(
      "not been changed or deleted",
    );
  });

  it("explains a plan fallback while preserving the saved premium intent", async () => {
    presentationState.draft = {
      saved: { ...basic, themeId: "premium-contrast" },
      effective: basic,
      resolutionReason: "entitlement-fallback",
      revision: 5,
      updatedAt: null,
    };

    const element = await AppearanceOnboardingPage({
      searchParams: Promise.resolve({ step: "theme" }),
    });

    expect(element.props.configuration).toEqual(basic);
    expect(element.props.fallbackNotice).toContain("Premium Contrast");
    expect(element.props.fallbackNotice).toContain(
      "has not been published or deleted",
    );
  });
});
