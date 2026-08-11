import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const resolveDashboardIdentity = mock(async () => ({
  scope: { effectiveUserId: "00000000-0000-4000-8000-000000000801" },
}));

const basic = {
  schemaVersion: 1 as const,
  templateId: "basic" as const,
  themeId: "clinical-light" as const,
  layoutVariant: "classic-stack" as const,
  answers: {},
};
let presentationState = {
  entitlement: { tier: "free" as const },
  published: {
    saved: basic,
    effective: basic,
    revision: 0,
    publishedAt: null,
  },
  draft: null as null | {
    configuration: typeof basic;
    revision: number;
    updatedAt: null;
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
      draft: null,
    };
  });

  it("canonicalizes a direct first visit to the color-theme step", async () => {
    await expect(
      AppearanceOnboardingPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/onboarding/appearance?step=theme");
  });

  it("resumes a saved private draft at the template step", async () => {
    presentationState.draft = {
      configuration: basic,
      revision: 3,
      updatedAt: null,
    };

    await expect(
      AppearanceOnboardingPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/onboarding/appearance?step=template");
  });

  it("does not allow template selection before color progress exists", async () => {
    await expect(
      AppearanceOnboardingPage({
        searchParams: Promise.resolve({ step: "template" }),
      }),
    ).rejects.toThrow("redirect:/onboarding/appearance?step=theme");
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
      configuration: basic,
      revision: 7,
      updatedAt: null,
    };
    const element = await AppearanceOnboardingPage({
      searchParams: Promise.resolve({ step: "template" }),
    });

    expect(element.props).toMatchObject({
      configuration: basic,
      entitlementTier: "free",
      revision: 7,
      step: "template",
    });
  });
});
