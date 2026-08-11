import {
  PROFILE_PRESENTATION_SCHEMA_VERSION,
  PROFILE_TEMPLATE_CATALOG,
  type ProfileModuleId,
  type ProfileTemplateId,
} from "../catalog";
import { parseProfileTemplateAnswers } from "../contract";

export const PROFILE_QUESTION_SET_VERSION = 1 as const;

export const QUESTION_CONTENT_SOURCES = [
  "treatments",
  "locations",
  "reviews",
  "galleries",
  "links",
  "products",
] as const;

export type QuestionContentSource = (typeof QUESTION_CONTENT_SOURCES)[number];

export const ONBOARDING_CONTENT_BUILDERS = [
  "profile",
  "socials",
  "treatment",
  "location",
  "review",
  "gallery",
  "link",
  "video",
  "product",
] as const;

export type OnboardingContentBuilder =
  (typeof ONBOARDING_CONTENT_BUILDERS)[number];

export type QuestionOption = {
  id: string;
  label: string;
  description?: string;
};

export type QuestionContentOptions = Record<
  QuestionContentSource,
  readonly QuestionOption[]
>;

type QuestionCondition = {
  field: string;
  equals: string | boolean;
};

type QuestionBase = {
  id: string;
  title: string;
  helpText: string;
  required: boolean;
  condition?: QuestionCondition;
};

export type ProfileQuestion = QuestionBase &
  (
    | {
        kind: "choice" | "multiple-choice";
        field: string;
        options: readonly QuestionOption[];
        maximum?: number;
      }
    | {
        kind: "boolean";
        field: string;
        trueLabel: string;
        falseLabel: string;
      }
    | {
        kind: "entity-single" | "entity-multiple";
        field: string;
        source: QuestionContentSource;
        builderHref: string;
        emptyMessage: string;
        maximum?: number;
      }
    | {
        kind: "content-review";
        builderLinks: readonly { href: string; label: string }[];
      }
    | {
        kind: "content-builder";
        builder: OnboardingContentBuilder;
        builderHref: string;
        allowMultiple?: boolean;
      }
  );

export type ProfileQuestionSet = {
  schemaVersion: typeof PROFILE_QUESTION_SET_VERSION;
  presentationSchemaVersion: typeof PROFILE_PRESENTATION_SCHEMA_VERSION;
  templateId: ProfileTemplateId;
  title: string;
  introduction: string;
  questions: readonly ProfileQuestion[];
  outputModuleOrder: readonly ProfileModuleId[];
};

const contentBuilder = (
  id: string,
  builder: OnboardingContentBuilder,
  title: string,
  helpText: string,
  builderHref: string,
  allowMultiple = false,
): ProfileQuestion => ({
  id,
  kind: "content-builder",
  builder,
  title,
  helpText,
  required: false,
  builderHref,
  allowMultiple,
});

const profileStep = contentBuilder(
  "profile-details",
  "profile",
  "Add your profile and booking details",
  "Use your own words for your bio, professional details, contact routes, and booking link. You can leave any optional field blank.",
  "/dashboard",
);

const socialStep = contentBuilder(
  "social-links",
  "socials",
  "Add social profiles",
  "Add only the social profiles you want patients to visit. Every field is optional.",
  "/dashboard",
);

const treatmentStep = contentBuilder(
  "treatments",
  "treatment",
  "Add treatments or services",
  "Give each item a clear name and description. Add another when your profile needs more than one.",
  "/dashboard/treatments",
  true,
);

const locationStep = contentBuilder(
  "locations",
  "location",
  "Add your practice locations",
  "Add an accurate address and contact location. You can add multiple locations before continuing.",
  "/dashboard/location",
  true,
);

const linkStep = contentBuilder(
  "links",
  "link",
  "Add useful links",
  "Add the title and destination for each resource, enquiry route, finance page, or other useful link.",
  "/dashboard/links",
  true,
);

const reviewStep = contentBuilder(
  "reviews",
  "review",
  "Add patient reviews",
  "Enter only feedback you are allowed to publish. You can add more than one review.",
  "/dashboard/review",
  true,
);

const galleryStep = contentBuilder(
  "gallery",
  "gallery",
  "Add gallery content",
  "Upload only images and before-and-after cases that you are allowed to publish.",
  "/dashboard/gallery",
  true,
);

const videoStep = contentBuilder(
  "videos",
  "video",
  "Add a video",
  "Add your own video title and link. You can add more videos later.",
  "/dashboard/video",
  true,
);

const productStep = contentBuilder(
  "products",
  "product",
  "Add products or paid resources",
  "Add the product name, price, platform, image, and destination exactly as patients should see them.",
  "/dashboard/shop",
  true,
);

export const PROFILE_QUESTION_SETS = {
  basic: {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "basic",
    title: "Build your profile",
    introduction:
      "Add the real content that will appear on your DentalBio. Every step can be skipped and completed later.",
    questions: [
      profileStep,
      socialStep,
      linkStep,
      treatmentStep,
      videoStep,
      galleryStep,
      locationStep,
    ],
    outputModuleOrder: PROFILE_TEMPLATE_CATALOG.basic.moduleOrder,
  },
  "direct-booking": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "direct-booking",
    title: "Build your booking profile",
    introduction:
      "Add the booking, contact, treatment, and location details patients need. Every step can be skipped.",
    questions: [profileStep, socialStep, treatmentStep, locationStep, linkStep],
    outputModuleOrder: PROFILE_TEMPLATE_CATALOG["direct-booking"].moduleOrder,
  },
  "location-provider-router": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "location-provider-router",
    title: "Build your location profile",
    introduction:
      "Add the real locations and contact details patients can choose from. Every step can be skipped.",
    questions: [profileStep, socialStep, locationStep, treatmentStep, linkStep],
    outputModuleOrder:
      PROFILE_TEMPLATE_CATALOG["location-provider-router"].moduleOrder,
  },
  "services-catalogue": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "services-catalogue",
    title: "Build your service catalogue",
    introduction:
      "Add your own services and supporting patient resources. Every step can be skipped.",
    questions: [profileStep, socialStep, treatmentStep, linkStep, locationStep],
    outputModuleOrder:
      PROFILE_TEMPLATE_CATALOG["services-catalogue"].moduleOrder,
  },
  "cosmetic-transformation": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "cosmetic-transformation",
    title: "Build your cosmetic profile",
    introduction:
      "Add your treatments, consented results, reviews, and consultation details. Every step can be skipped.",
    questions: [
      profileStep,
      socialStep,
      treatmentStep,
      galleryStep,
      reviewStep,
      locationStep,
    ],
    outputModuleOrder:
      PROFILE_TEMPLATE_CATALOG["cosmetic-transformation"].moduleOrder,
  },
  "trust-first-family-practice": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "trust-first-family-practice",
    title: "Build your family practice profile",
    introduction:
      "Add the biography, proof, contact, and practical information that helps families feel confident. Every step can be skipped.",
    questions: [
      profileStep,
      socialStep,
      reviewStep,
      linkStep,
      treatmentStep,
      locationStep,
    ],
    outputModuleOrder:
      PROFILE_TEMPLATE_CATALOG["trust-first-family-practice"].moduleOrder,
  },
  "specialist-assessment": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "specialist-assessment",
    title: "Build your specialist profile",
    introduction:
      "Add your assessment, referral, booking, and supporting resource links in your own words. Every step can be skipped.",
    questions: [profileStep, socialStep, linkStep, treatmentStep, locationStep],
    outputModuleOrder:
      PROFILE_TEMPLATE_CATALOG["specialist-assessment"].moduleOrder,
  },
  "expert-educator": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "expert-educator",
    title: "Build your expert profile",
    introduction:
      "Add your biography, social profiles, articles, talks, and patient resources. Every step can be skipped.",
    questions: [profileStep, socialStep, linkStep, videoStep, locationStep],
    outputModuleOrder: PROFILE_TEMPLATE_CATALOG["expert-educator"].moduleOrder,
  },
  "clinic-commerce": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "clinic-commerce",
    title: "Build your clinic and shop profile",
    introduction:
      "Add the clinical booking details and products patients can actually use. Every step can be skipped.",
    questions: [
      profileStep,
      socialStep,
      treatmentStep,
      productStep,
      locationStep,
    ],
    outputModuleOrder: PROFILE_TEMPLATE_CATALOG["clinic-commerce"].moduleOrder,
  },
} as const satisfies Record<ProfileTemplateId, ProfileQuestionSet>;

export function getProfileQuestionSet(templateId: ProfileTemplateId) {
  return PROFILE_QUESTION_SETS[templateId] as ProfileQuestionSet;
}

export function isQuestionVisible(
  question: ProfileQuestion,
  answers: Readonly<Record<string, unknown>>,
) {
  if (!question.condition) return true;
  return answers[question.condition.field] === question.condition.equals;
}

export function getVisibleProfileQuestions(
  templateId: ProfileTemplateId,
  answers: Readonly<Record<string, unknown>>,
) {
  return getProfileQuestionSet(templateId).questions.filter((question) =>
    isQuestionVisible(question, answers),
  );
}

export type QuestionValidationResult =
  | { success: true; answers: Record<string, unknown> }
  | { success: false; fieldErrors: Record<string, string> };

function isMissing(value: unknown) {
  return (
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && !value.length)
  );
}

type EntityAnswerRule = {
  field: string;
  source: QuestionContentSource;
  multiple: boolean;
  maximum: number;
};

const entityAnswerRules: Record<
  ProfileTemplateId,
  readonly EntityAnswerRule[]
> = {
  basic: [],
  "direct-booking": [
    {
      field: "featuredTreatmentIds",
      source: "treatments",
      multiple: true,
      maximum: 3,
    },
  ],
  "location-provider-router": [
    {
      field: "defaultLocationId",
      source: "locations",
      multiple: false,
      maximum: 1,
    },
  ],
  "services-catalogue": [
    {
      field: "featuredTreatmentIds",
      source: "treatments",
      multiple: true,
      maximum: 3,
    },
  ],
  "cosmetic-transformation": [
    {
      field: "signatureTreatmentId",
      source: "treatments",
      multiple: false,
      maximum: 1,
    },
    {
      field: "featuredGalleryIds",
      source: "galleries",
      multiple: true,
      maximum: 6,
    },
    {
      field: "featuredReviewIds",
      source: "reviews",
      multiple: true,
      maximum: 3,
    },
  ],
  "trust-first-family-practice": [
    {
      field: "featuredReviewIds",
      source: "reviews",
      multiple: true,
      maximum: 2,
    },
  ],
  "specialist-assessment": [],
  "expert-educator": [
    {
      field: "featuredContentId",
      source: "links",
      multiple: false,
      maximum: 1,
    },
  ],
  "clinic-commerce": [
    {
      field: "featuredProductId",
      source: "products",
      multiple: false,
      maximum: 1,
    },
  ],
};

function allowedOptions(
  question: Extract<ProfileQuestion, { field: string }> &
    Exclude<ProfileQuestion, { kind: "boolean" }>,
  contentOptions: QuestionContentOptions,
) {
  switch (question.kind) {
    case "entity-single":
    case "entity-multiple":
      return contentOptions[question.source];
    case "choice":
    case "multiple-choice":
      return question.options;
  }
}

export function validateProfileQuestionAnswers(input: {
  templateId: ProfileTemplateId;
  answers: Readonly<Record<string, unknown>>;
  contentOptions: QuestionContentOptions;
  requireCompletion?: boolean;
}): QuestionValidationResult {
  const parsedAnswers = parseProfileTemplateAnswers(
    input.templateId,
    input.answers,
  );
  if (!parsedAnswers.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsedAnswers.error.issues) {
      const field = String(issue.path[0] ?? "answers");
      fieldErrors[field] = issue.message;
    }
    return { success: false, fieldErrors };
  }

  const questions = getVisibleProfileQuestions(input.templateId, input.answers);
  const fieldErrors: Record<string, string> = {};

  for (const rule of entityAnswerRules[input.templateId]) {
    const value = input.answers[rule.field];
    if (isMissing(value)) continue;
    const ids = rule.multiple ? value : [value];
    const validIds = new Set(
      input.contentOptions[rule.source].map(({ id }) => id),
    );
    if (
      !Array.isArray(ids) ||
      ids.some((id) => typeof id !== "string" || !validIds.has(id))
    ) {
      fieldErrors[rule.field] = rule.multiple
        ? "Choose only available options."
        : "Choose one of the available options.";
      continue;
    }
    if (new Set(ids).size !== ids.length) {
      fieldErrors[rule.field] = "Choose each option only once.";
      continue;
    }
    if (ids.length > rule.maximum) {
      fieldErrors[rule.field] = `Choose no more than ${rule.maximum}.`;
    }
  }

  for (const question of questions) {
    if (!("field" in question)) continue;
    const value = input.answers[question.field];
    if (input.requireCompletion && question.required && isMissing(value)) {
      fieldErrors[question.field] = "Choose an answer before continuing.";
      continue;
    }
    if (isMissing(value)) continue;

    if (question.kind === "boolean") {
      if (typeof value !== "boolean")
        fieldErrors[question.field] = "Choose yes or no.";
      continue;
    }

    const validIds = new Set(
      (allowedOptions(question, input.contentOptions) ?? []).map(
        ({ id }) => id,
      ),
    );
    if (question.kind === "choice" || question.kind === "entity-single") {
      if (typeof value !== "string" || !validIds.has(value)) {
        fieldErrors[question.field] = "Choose one of the available options.";
      }
      continue;
    }

    if (
      !Array.isArray(value) ||
      value.some((id) => typeof id !== "string" || !validIds.has(id))
    ) {
      fieldErrors[question.field] = "Choose only available options.";
      continue;
    }
    if (new Set(value).size !== value.length) {
      fieldErrors[question.field] = "Choose each option only once.";
      continue;
    }
    if (question.maximum !== undefined && value.length > question.maximum) {
      fieldErrors[question.field] = `Choose no more than ${question.maximum}.`;
    }
  }

  return Object.keys(fieldErrors).length
    ? { success: false, fieldErrors }
    : { success: true, answers: parsedAnswers.data as Record<string, unknown> };
}

export function summarizeProfileQuestionAnswers(input: {
  templateId: ProfileTemplateId;
  answers: Readonly<Record<string, unknown>>;
  contentOptions: QuestionContentOptions;
}) {
  const summary: { questionId: string; label: string; value: string }[] = [];
  for (const question of getVisibleProfileQuestions(
    input.templateId,
    input.answers,
  )) {
    if (!("field" in question)) {
      summary.push({
        questionId: question.id,
        label: question.title,
        value:
          question.kind === "content-builder"
            ? "Profile content can be added now or later"
            : "Existing profile content retained",
      });
      continue;
    }
    const value = input.answers[question.field];
    if (isMissing(value)) continue;
    if (question.kind === "boolean") {
      summary.push({
        questionId: question.id,
        label: question.title,
        value: value ? question.trueLabel : question.falseLabel,
      });
      continue;
    }
    const options = allowedOptions(question, input.contentOptions) ?? [];
    const ids = Array.isArray(value) ? value : [value];
    const labels = ids.flatMap((id) => {
      const option = options.find((candidate) => candidate.id === id);
      return option ? [option.label] : [];
    });
    summary.push({
      questionId: question.id,
      label: question.title,
      value: labels.join(", "),
    });
  }
  return summary;
}
