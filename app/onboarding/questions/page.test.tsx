import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const scope = {
  effectiveUserId: "00000000-0000-4000-8000-000000000801",
  dentistryId: "00000000-0000-4000-8000-000000000802",
  username: "question-owner",
  canManageSubscription: true,
};
const resolveDashboardIdentity = mock(async () => ({ scope }));
const basic = {
  schemaVersion: 1 as const,
  templateId: "basic" as const,
  themeId: "clinical-light" as const,
  layoutVariant: "classic-stack" as const,
  answers: {},
};
const direct = {
  ...basic,
  templateId: "direct-booking" as const,
  answers: { primaryAction: "booking" as const },
};
let presentationState: any;
const getProfilePresentationState = mock(async () => presentationState);
const contentOptions = {
  treatments: [{ id: "11", label: "Invisalign" }],
  locations: [],
  reviews: [],
  galleries: [],
  links: [],
  products: [],
};
const getQuestionContentOptions = mock(async () => contentOptions);
const profile = {
  user: { title: "", position: "", gdcNo: "", qualification: "" },
  dentistry: {
    aboutTitle: "",
    aboutText: "",
    phone: "",
    contactEmail: "",
    website: "",
    bookingLink: "",
    bookingEnabled: false,
  },
  socials: {
    linkedin: "",
    twitter: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    other: "",
  },
  profilePicture: { objectPath: null, publicUrl: null },
};
const getProfileViewModel = mock(async () => profile);
const getLinkAggregate = mock(async () => ({ groups: [] }));
const getVideoAggregate = mock(async () => ({ groups: [] }));
const treatments = { treatments: [], services: [] };
const locations = { title: "Locations", canAddLocation: true, locations: [] };
const reviews = { reviews: [], externalPage: null };
const galleries = { dental: [], general: [] };
const products = { products: [] };
const getTreatmentAggregate = mock(async () => treatments);
const getLocationAggregate = mock(async () => locations);
const getReviewAggregate = mock(async () => reviews);
const getGalleryAggregate = mock(async () => galleries);
const getProductAggregate = mock(async () => products);
const getProfileOnboardingProgress = mock(async () => ({
  templateId: "direct-booking",
  completedStepIds: ["profile-details"],
  revision: 1,
  updatedAt: null,
}));

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/profile-presentation/repository", () => ({
  getProfilePresentationState,
}));
mock.module("@/lib/profile-presentation/questions/content-options", () => ({
  getQuestionContentOptions,
}));
mock.module("@/app/dashboard/_lib/profile/queries", () => ({
  getProfileViewModel,
}));
mock.module("@/app/dashboard/links/_lib/queries", () => ({
  getLinkAggregate,
}));
mock.module("@/app/dashboard/video/_lib/queries", () => ({
  getVideoAggregate,
}));
mock.module("@/app/dashboard/treatments/_lib/queries", () => ({
  getTreatmentAggregate,
}));
mock.module("@/app/dashboard/location/_lib/queries", () => ({
  getLocationAggregate,
}));
mock.module("@/app/dashboard/review/_lib/queries", () => ({
  getReviewAggregate,
}));
mock.module("@/app/dashboard/gallery/_lib/queries", () => ({
  getGalleryAggregate,
}));
mock.module("@/app/dashboard/shop/_lib/queries", () => ({
  getProductAggregate,
}));
mock.module("@/lib/profile-presentation/onboarding-progress", () => ({
  getProfileOnboardingProgress,
}));
mock.module("./_components/TemplateQuestionFlow", () => ({
  TemplateQuestionFlow: (props: Record<string, unknown>) => ({
    type: "template-question-flow",
    props,
  }),
}));
mock.module("./_components/QuestionFlowLocked", () => ({
  QuestionFlowLocked: (props: Record<string, unknown>) => ({
    type: "question-flow-locked",
    props,
  }),
}));

const { default: TemplateQuestionsPage } = await import("./page");

function validState() {
  return {
    entitlement: { tier: "free" },
    published: {
      saved: basic,
      effective: basic,
      revision: 0,
      publishedAt: null,
    },
    draft: {
      saved: direct,
      effective: direct,
      resolutionReason: "valid",
      revision: 5,
      updatedAt: null,
    },
  };
}

describe("TemplateQuestionsPage", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockReset();
    resolveDashboardIdentity.mockResolvedValue({ scope });
    getProfilePresentationState.mockClear();
    getQuestionContentOptions.mockClear();
    presentationState = validState();
  });

  it("redirects unauthenticated visitors before private content reads", async () => {
    resolveDashboardIdentity.mockRejectedValueOnce(
      new Error("UNAUTHENTICATED"),
    );

    await expect(
      TemplateQuestionsPage({
        searchParams: Promise.resolve({ template: "direct-booking" }),
      }),
    ).rejects.toThrow("redirect:/login");
    expect(getProfilePresentationState).not.toHaveBeenCalled();
    expect(getQuestionContentOptions).not.toHaveBeenCalled();
  });

  it("returns missing appearance drafts to the first onboarding step", async () => {
    presentationState.draft = {
      saved: null,
      effective: basic,
      resolutionReason: "missing",
      revision: 0,
      updatedAt: null,
    };

    await expect(
      TemplateQuestionsPage({
        searchParams: Promise.resolve({ template: "basic" }),
      }),
    ).rejects.toThrow("redirect:/onboarding/appearance?step=theme");
  });

  it("uses the authenticated draft rather than a query-selected template", async () => {
    await expect(
      TemplateQuestionsPage({
        searchParams: Promise.resolve({ template: "clinic-commerce" }),
      }),
    ).rejects.toThrow(
      "redirect:/onboarding/questions?template=direct-booking&notice=selection-updated",
    );
    expect(getQuestionContentOptions).not.toHaveBeenCalled();
  });

  it("passes stable draft and owned entity options into the canonical question", async () => {
    const element = await TemplateQuestionsPage({
      searchParams: Promise.resolve({
        template: "direct-booking",
        step: "profile-details",
      }),
    });

    expect(element.props).toMatchObject({
      initialAnswers: direct.answers,
      initialCompletedStepIds: ["profile-details"],
      initialRevision: 5,
      initialStep: "profile-details",
      templateId: "direct-booking",
      themeId: "clinical-light",
      contentOptions,
      builderContext: {
        treatments,
        locations,
        reviews,
        galleries,
        products,
      },
    });
    expect(getQuestionContentOptions).toHaveBeenCalledWith(scope);
  });

  it("server-authorizes and passes the admin-selected profile to every builder", async () => {
    const targetUserId = "22222222-2222-4222-8222-222222222222";
    const element = await TemplateQuestionsPage({
      searchParams: Promise.resolve({
        template: "direct-booking",
        step: "profile-details",
        userId: targetUserId,
      }),
    });

    expect(resolveDashboardIdentity).toHaveBeenCalledWith(targetUserId);
    expect(element.props.targetUserId).toBe(targetUserId);
    expect(element.props.builderContext.targetHint).toBe(targetUserId);
  });

  it("accepts known content steps and canonicalizes unknown legacy steps", async () => {
    await expect(
      TemplateQuestionsPage({
        searchParams: Promise.resolve({
          template: "direct-booking",
          step: "social-links",
        }),
      }),
    ).resolves.toBeDefined();

    await expect(
      TemplateQuestionsPage({
        searchParams: Promise.resolve({
          template: "direct-booking",
          step: "unknown-question",
        }),
      }),
    ).rejects.toThrow(
      "redirect:/onboarding/questions?template=direct-booking&step=profile-details",
    );
  });

  it("locks malformed and unsupported drafts without exposing raw data", async () => {
    presentationState.draft = {
      saved: null,
      effective: basic,
      resolutionReason: "malformed",
      revision: 9,
      updatedAt: null,
    };

    const element = await TemplateQuestionsPage({
      searchParams: Promise.resolve({ template: "basic" }),
    });
    expect(element.props.reason).toContain("could not be read safely");
    expect(getQuestionContentOptions).not.toHaveBeenCalled();
  });

  it("explains entitlement fallback while using its safe effective draft", async () => {
    presentationState.draft = {
      saved: { ...direct, themeId: "premium-contrast" },
      effective: direct,
      resolutionReason: "entitlement-fallback",
      revision: 8,
      updatedAt: null,
    };
    const element = await TemplateQuestionsPage({
      searchParams: Promise.resolve({
        template: "direct-booking",
        step: "profile-details",
      }),
    });

    expect(element.props.fallbackNotice).toContain("not available");
    expect(element.props.fallbackNotice).toContain(
      "not been published or deleted",
    );
  });
});
