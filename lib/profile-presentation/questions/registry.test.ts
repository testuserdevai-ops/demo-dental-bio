import { describe, expect, it } from "bun:test";

import { PROFILE_TEMPLATE_IDS } from "../catalog";
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
  it("registers a versioned, distinct question set and module order for every template", () => {
    expect(Object.keys(PROFILE_QUESTION_SETS).sort()).toEqual(
      [...PROFILE_TEMPLATE_IDS].sort(),
    );
    const signatures = PROFILE_TEMPLATE_IDS.map((templateId) => {
      const set = getProfileQuestionSet(templateId);
      expect(set.schemaVersion).toBe(1);
      expect(set.presentationSchemaVersion).toBe(1);
      expect(set.outputModuleOrder.length).toBeGreaterThan(0);
      expect(set.questions.length).toBeGreaterThan(0);
      return set.questions.map(({ id }) => id).join("|");
    });
    expect(new Set(signatures).size).toBe(PROFILE_TEMPLATE_IDS.length);
  });

  it("reveals controlled follow-ups without executing template-authored code", () => {
    expect(
      getVisibleProfileQuestions("location-provider-router", {}),
    ).toHaveLength(1);
    expect(
      getVisibleProfileQuestions("location-provider-router", {
        routerKind: "location",
      }).map(({ id }) => id),
    ).toEqual(["router-kind", "router-default-location"]);
    expect(
      getVisibleProfileQuestions("location-provider-router", {
        routerKind: "provider",
      }).map(({ id }) => id),
    ).toEqual(["router-kind"]);
  });

  it("validates required values, controlled choices, entity IDs, and maximums", () => {
    expect(
      validateProfileQuestionAnswers({
        templateId: "direct-booking",
        answers: {},
        contentOptions,
        requireCompletion: true,
      }),
    ).toEqual({
      success: false,
      fieldErrors: {
        primaryAction: "Choose an answer before continuing.",
        featuredTreatmentIds: "Choose an answer before continuing.",
      },
    });

    expect(
      validateProfileQuestionAnswers({
        templateId: "direct-booking",
        answers: {
          primaryAction: "booking",
          featuredTreatmentIds: ["11", "12"],
        },
        contentOptions,
      }),
    ).toEqual({
      success: false,
      fieldErrors: { featuredTreatmentIds: "Choose only available options." },
    });
  });

  it("allows incomplete autosaves while rejecting unknown fields", () => {
    expect(
      validateProfileQuestionAnswers({
        templateId: "clinic-commerce",
        answers: { defaultAudience: "clinic" },
        contentOptions,
      }),
    ).toEqual({
      success: true,
      answers: { defaultAudience: "clinic" },
    });
    expect(
      validateProfileQuestionAnswers({
        templateId: "clinic-commerce",
        answers: { clinicalNotes: "private" },
        contentOptions,
      }),
    ).toEqual({
      success: false,
      fieldErrors: {
        clinicalNotes: "This answer is not part of the selected template.",
      },
    });
  });

  it("produces a deterministic human-readable review without raw identifiers", () => {
    expect(
      summarizeProfileQuestionAnswers({
        templateId: "cosmetic-transformation",
        answers: {
          signatureTreatmentId: "11",
          consultationKind: "virtual",
          featuredGalleryIds: ["31"],
        },
        contentOptions,
      }),
    ).toEqual([
      {
        questionId: "cosmetic-signature-treatment",
        label: "What is your signature treatment?",
        value: "Invisalign",
      },
      {
        questionId: "cosmetic-consultation-kind",
        label: "What is the first consultation step?",
        value: "Virtual consultation",
      },
      {
        questionId: "cosmetic-gallery",
        label: "Which consented cases should be featured?",
        value: "Smile case",
      },
    ]);
  });
});
