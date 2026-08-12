import { describe, expect, it } from "bun:test";

import { PROFILE_TEMPLATE_IDS } from "../catalog";
import { parseProfilePresentationConfiguration } from "../contract";
import {
  getProfileQuestionSet,
  getVisibleProfileQuestions,
  PROFILE_QUESTION_SETS,
  summarizeProfileQuestionAnswers,
  validateProfileQuestionAnswers,
  type QuestionContentOptions,
} from "./registry";

const contentOptions: QuestionContentOptions = {
  treatments: [{ id: "11", label: "Invisalign" }],
  locations: [
    { id: "00000000-0000-4000-8000-000000000011", label: "City clinic" },
  ],
  reviews: [{ id: "21", label: "Review by Sam" }],
  galleries: [{ id: "31", label: "Smile case" }],
  links: [
    { id: "00000000-0000-4000-8000-000000000041", label: "Research article" },
  ],
  products: [{ id: "51", label: "Care guide" }],
};

describe("profile onboarding question registry", () => {
  it("registers a versioned content walkthrough and module order for every template", () => {
    expect(Object.keys(PROFILE_QUESTION_SETS).sort()).toEqual(
      [...PROFILE_TEMPLATE_IDS].sort(),
    );
    for (const templateId of PROFILE_TEMPLATE_IDS) {
      const set = getProfileQuestionSet(templateId);
      expect(set.schemaVersion).toBe(1);
      expect(set.presentationSchemaVersion).toBe(1);
      expect(set.outputModuleOrder.length).toBeGreaterThan(0);
      expect(set.questions.length).toBeGreaterThan(0);
      expect(set.questions.every(({ required }) => required === false)).toBe(
        true,
      );
      expect(
        set.questions.every(({ kind }) => kind === "content-builder"),
      ).toBe(true);
      expect(set.questions.some(({ id }) => id === "profile-details")).toBe(
        true,
      );
      expect(set.questions.some(({ id }) => id === "social-links")).toBe(true);
    }
  });

  it("uses real content builders instead of asking new users to rank missing entities", () => {
    const router = getVisibleProfileQuestions("location-provider-router", {});
    expect(router.map(({ id }) => id)).toEqual([
      "profile-details",
      "social-links",
      "locations",
      "treatments",
      "links",
    ]);
    expect(router.find(({ id }) => id === "locations")).toMatchObject({
      kind: "content-builder",
      builder: "location",
      allowMultiple: true,
    });
    expect(router.some(({ kind }) => kind.startsWith("entity-"))).toBe(false);
  });

  it("allows every walkthrough step to be skipped while retaining valid legacy preferences", () => {
    expect(
      validateProfileQuestionAnswers({
        templateId: "direct-booking",
        answers: {},
        contentOptions,
        requireCompletion: true,
      }),
    ).toEqual({ success: true, answers: {} });

    expect(
      validateProfileQuestionAnswers({
        templateId: "direct-booking",
        answers: {
          primaryAction: "booking",
          featuredTreatmentIds: ["11"],
        },
        contentOptions,
      }),
    ).toEqual({
      success: true,
      answers: { primaryAction: "booking", featuredTreatmentIds: ["11"] },
    });
  });

  it("summarizes setup steps without inventing owner content", () => {
    const summary = summarizeProfileQuestionAnswers({
      templateId: "cosmetic-transformation",
      answers: {},
      contentOptions,
    });
    expect(summary.map(({ questionId }) => questionId)).toEqual([
      "profile-details",
      "social-links",
      "treatments",
      "gallery",
      "reviews",
      "locations",
    ]);
    expect(
      summary.every(
        ({ value }) => value === "Profile content can be added now or later",
      ),
    ).toBe(true);
  });

  it("completes and satisfies the shared presentation contract for all nine templates", () => {
    const fixtures = {
      basic: {},
      "direct-booking": {
        primaryAction: "booking",
        secondaryAction: "phone",
        featuredTreatmentIds: ["11"],
      },
      "location-provider-router": {
        routerKind: "location",
        defaultLocationId: "00000000-0000-4000-8000-000000000011",
      },
      "services-catalogue": {
        featuredTreatmentIds: ["11"],
        showFinancingBeforeTeam: true,
      },
      "cosmetic-transformation": {
        signatureTreatmentId: "11",
        consultationKind: "virtual",
        featuredGalleryIds: ["31"],
        featuredReviewIds: ["21"],
      },
      "trust-first-family-practice": {
        featuredReviewIds: ["21"],
        priorityInformation: ["accessibility", "anxiety-care"],
      },
      "specialist-assessment": {
        primaryPath: "assessment",
        referralRequired: false,
        showEmergencyFirst: true,
      },
      "expert-educator": {
        defaultAudience: "patients",
        featuredContentId: "00000000-0000-4000-8000-000000000041",
      },
      "clinic-commerce": {
        defaultAudience: "clinic",
        featuredProductId: "51",
      },
    } as const;

    for (const templateId of PROFILE_TEMPLATE_IDS) {
      const answers = fixtures[templateId];
      expect(
        validateProfileQuestionAnswers({
          templateId,
          answers,
          contentOptions,
          requireCompletion: true,
        }),
      ).toEqual({ success: true, answers });
      const parsed = parseProfilePresentationConfiguration(
        {
          schemaVersion: 1,
          templateId,
          themeId: "clinical-light",
          layoutVariant: "classic-stack",
          answers,
        },
        { tier: "pro" },
      );
      expect(JSON.stringify(parsed.answers)).toBe(JSON.stringify(answers));
    }
  });
});
