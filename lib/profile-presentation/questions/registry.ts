import {
  PROFILE_PRESENTATION_SCHEMA_VERSION,
  PROFILE_TEMPLATE_CATALOG,
  type ProfileModuleId,
  type ProfileTemplateId,
} from "../catalog";

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

const actionOptions = [
  { id: "booking", label: "Book an appointment" },
  { id: "assessment", label: "Start an assessment" },
  { id: "website", label: "Visit my website" },
  { id: "whatsapp", label: "Message on WhatsApp" },
  { id: "phone", label: "Call the practice" },
  { id: "email", label: "Email the practice" },
] as const;

const allBuilderLinks = [
  { href: "/dashboard/profile", label: "Profile and contact details" },
  { href: "/dashboard/links", label: "Links" },
  { href: "/dashboard/treatments", label: "Treatments and services" },
  { href: "/dashboard/video", label: "Videos" },
  { href: "/dashboard/gallery", label: "Gallery" },
  { href: "/dashboard/review", label: "Reviews" },
  { href: "/dashboard/location", label: "Locations" },
  { href: "/dashboard/shop", label: "Products" },
] as const;

export const PROFILE_QUESTION_SETS = {
  basic: {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "basic",
    title: "Review your existing profile",
    introduction:
      "Basic keeps the familiar DentalBio order. Add or refine content in the existing builders, then return here to review the draft.",
    questions: [
      {
        id: "basic-content-review",
        kind: "content-review",
        title: "Is your core profile content ready?",
        helpText:
          "No new answers are required for Basic. These links open the same content editors used by every template.",
        required: false,
        builderLinks: allBuilderLinks,
      },
    ],
    outputModuleOrder: PROFILE_TEMPLATE_CATALOG.basic.moduleOrder,
  },
  "direct-booking": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "direct-booking",
    title: "Set up a direct booking journey",
    introduction:
      "Choose one clear first action, a supporting contact route, and up to three treatments to feature.",
    questions: [
      {
        id: "direct-primary-action",
        kind: "choice",
        field: "primaryAction",
        title: "What should most visitors do first?",
        helpText:
          "The destination comes from your existing booking, contact, or link settings.",
        required: true,
        options: actionOptions,
      },
      {
        id: "direct-secondary-action",
        kind: "choice",
        field: "secondaryAction",
        title: "Which supporting action should appear second?",
        helpText: "You can skip this if one action is enough.",
        required: false,
        condition: { field: "primaryAction", equals: "booking" },
        options: actionOptions.filter(({ id }) => id !== "booking"),
      },
      {
        id: "direct-featured-treatments",
        kind: "entity-multiple",
        field: "featuredTreatmentIds",
        source: "treatments",
        title: "Which treatments should visitors see first?",
        helpText: "Choose up to three existing treatments in display order.",
        required: true,
        maximum: 3,
        builderHref: "/dashboard/treatments",
        emptyMessage: "Add a treatment before choosing featured treatments.",
      },
    ],
    outputModuleOrder: PROFILE_TEMPLATE_CATALOG["direct-booking"].moduleOrder,
  },
  "location-provider-router": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "location-provider-router",
    title: "Build your visitor route",
    introduction:
      "Decide what visitors choose first and, for location routing, which saved location opens by default.",
    questions: [
      {
        id: "router-kind",
        kind: "choice",
        field: "routerKind",
        title: "What should visitors choose first?",
        helpText:
          "This controls the selector label and the content shown below it.",
        required: true,
        options: [
          { id: "location", label: "Location" },
          { id: "provider", label: "Clinician or provider" },
          { id: "appointment-type", label: "Appointment type" },
        ],
      },
      {
        id: "router-default-location",
        kind: "entity-single",
        field: "defaultLocationId",
        source: "locations",
        title: "Which location should open first?",
        helpText:
          "The selected card will reuse its saved address, coordinates, and contact details.",
        required: true,
        condition: { field: "routerKind", equals: "location" },
        builderHref: "/dashboard/location",
        emptyMessage: "Add a location before choosing the default.",
      },
    ],
    outputModuleOrder:
      PROFILE_TEMPLATE_CATALOG["location-provider-router"].moduleOrder,
  },
  "services-catalogue": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "services-catalogue",
    title: "Prioritize your service catalogue",
    introduction:
      "Lead with the treatments patients seek most, then decide where practical payment information belongs.",
    questions: [
      {
        id: "catalogue-featured-treatments",
        kind: "entity-multiple",
        field: "featuredTreatmentIds",
        source: "treatments",
        title: "Which three treatments should be featured?",
        helpText: "Choose one to three existing treatments.",
        required: true,
        maximum: 3,
        builderHref: "/dashboard/treatments",
        emptyMessage: "Add treatments before building the catalogue.",
      },
      {
        id: "catalogue-financing-order",
        kind: "boolean",
        field: "showFinancingBeforeTeam",
        title: "Show financing information before the team?",
        helpText:
          "Choose yes when cost or insurance questions commonly affect booking.",
        required: false,
        trueLabel: "Yes, show it earlier",
        falseLabel: "No, keep the team first",
      },
    ],
    outputModuleOrder:
      PROFILE_TEMPLATE_CATALOG["services-catalogue"].moduleOrder,
  },
  "cosmetic-transformation": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "cosmetic-transformation",
    title: "Shape a transformation story",
    introduction:
      "Anchor the profile around one treatment, a clear consultation path, and consented proof already in your builders.",
    questions: [
      {
        id: "cosmetic-signature-treatment",
        kind: "entity-single",
        field: "signatureTreatmentId",
        source: "treatments",
        title: "What is your signature treatment?",
        helpText: "Choose an existing treatment for the lead treatment card.",
        required: true,
        builderHref: "/dashboard/treatments",
        emptyMessage: "Add your signature treatment before selecting it.",
      },
      {
        id: "cosmetic-consultation-kind",
        kind: "choice",
        field: "consultationKind",
        title: "What is the first consultation step?",
        helpText: "Use an accurate label for the experience patients receive.",
        required: true,
        options: [
          { id: "in-person", label: "In-person consultation" },
          { id: "virtual", label: "Virtual consultation" },
          { id: "free", label: "Free consultation" },
        ],
      },
      {
        id: "cosmetic-gallery",
        kind: "entity-multiple",
        field: "featuredGalleryIds",
        source: "galleries",
        title: "Which consented cases should be featured?",
        helpText:
          "Choose only cases whose existing images and labels are approved for public display.",
        required: false,
        maximum: 6,
        builderHref: "/dashboard/gallery",
        emptyMessage: "Add a before-and-after case to feature it here.",
      },
      {
        id: "cosmetic-reviews",
        kind: "entity-multiple",
        field: "featuredReviewIds",
        source: "reviews",
        title: "Which reviews support this treatment?",
        helpText: "Choose up to three enabled reviews.",
        required: false,
        maximum: 3,
        builderHref: "/dashboard/review",
        emptyMessage: "Add a review before featuring patient feedback.",
      },
    ],
    outputModuleOrder:
      PROFILE_TEMPLATE_CATALOG["cosmetic-transformation"].moduleOrder,
  },
  "trust-first-family-practice": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "trust-first-family-practice",
    title: "Lead with trust and reassurance",
    introduction:
      "Choose the patient proof and practical information that should reduce uncertainty before booking.",
    questions: [
      {
        id: "trust-featured-reviews",
        kind: "entity-multiple",
        field: "featuredReviewIds",
        source: "reviews",
        title: "Which reviews should reassure new patients?",
        helpText: "Choose up to two enabled reviews.",
        required: true,
        maximum: 2,
        builderHref: "/dashboard/review",
        emptyMessage: "Add a review before choosing patient proof.",
      },
      {
        id: "trust-priority-information",
        kind: "multiple-choice",
        field: "priorityInformation",
        title: "What information should patients see before booking?",
        helpText: "Select every topic that commonly affects confidence.",
        required: false,
        maximum: 4,
        options: [
          { id: "payment", label: "Payment options" },
          { id: "insurance", label: "Insurance" },
          { id: "accessibility", label: "Accessibility" },
          { id: "anxiety-care", label: "Anxiety-aware care" },
        ],
      },
    ],
    outputModuleOrder:
      PROFILE_TEMPLATE_CATALOG["trust-first-family-practice"].moduleOrder,
  },
  "specialist-assessment": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "specialist-assessment",
    title: "Configure the specialist first step",
    introduction:
      "Separate assessment from appointment booking and surface referral or urgent-care guidance accurately.",
    questions: [
      {
        id: "specialist-primary-path",
        kind: "choice",
        field: "primaryPath",
        title: "What is the preferred first step?",
        helpText: "Assessment and consultation remain distinct actions.",
        required: true,
        options: [
          { id: "assessment", label: "Online assessment" },
          { id: "consultation", label: "Book a consultation" },
        ],
      },
      {
        id: "specialist-referral",
        kind: "boolean",
        field: "referralRequired",
        title: "Is a referral required?",
        helpText:
          "This creates a clear eligibility message near the first action.",
        required: true,
        trueLabel: "Yes, a referral is required",
        falseLabel: "No referral is required",
      },
      {
        id: "specialist-emergency",
        kind: "boolean",
        field: "showEmergencyFirst",
        title: "Should urgent-care guidance appear before routine booking?",
        helpText:
          "Choose yes only when your existing aftercare or emergency content is current.",
        required: false,
        condition: { field: "referralRequired", equals: false },
        trueLabel: "Yes, prioritize urgent guidance",
        falseLabel: "No, keep routine booking first",
      },
    ],
    outputModuleOrder:
      PROFILE_TEMPLATE_CATALOG["specialist-assessment"].moduleOrder,
  },
  "expert-educator": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "expert-educator",
    title: "Guide patients and professionals",
    introduction:
      "Choose the default audience and one existing article, talk, or resource link to establish authority.",
    questions: [
      {
        id: "expert-default-audience",
        kind: "choice",
        field: "defaultAudience",
        title: "Who should see their route first?",
        helpText:
          "Patients remain the safest default when both audiences matter.",
        required: true,
        options: [
          { id: "patients", label: "Patients" },
          { id: "professionals", label: "Dental professionals" },
        ],
      },
      {
        id: "expert-featured-content",
        kind: "entity-single",
        field: "featuredContentId",
        source: "links",
        title: "Which existing resource best establishes authority?",
        helpText:
          "Choose a link already created for an article, talk, press feature, or professional resource.",
        required: false,
        builderHref: "/dashboard/links",
        emptyMessage: "Add a resource link before choosing featured content.",
      },
    ],
    outputModuleOrder: PROFILE_TEMPLATE_CATALOG["expert-educator"].moduleOrder,
  },
  "clinic-commerce": {
    schemaVersion: 1,
    presentationSchemaVersion: 1,
    templateId: "clinic-commerce",
    title: "Balance clinical care and commerce",
    introduction:
      "Keep patient care prominent while choosing the audience and product that should lead the shop section.",
    questions: [
      {
        id: "commerce-default-audience",
        kind: "choice",
        field: "defaultAudience",
        title: "Which side should the audience switch open on?",
        helpText: "Clinical booking remains above the shop in either case.",
        required: true,
        options: [
          { id: "clinic", label: "Clinic" },
          { id: "shop", label: "Shop" },
        ],
      },
      {
        id: "commerce-featured-product",
        kind: "entity-single",
        field: "featuredProductId",
        source: "products",
        title: "Which product or resource should be featured?",
        helpText:
          "The card reuses its existing image, price, seller, currency, and external link.",
        required: true,
        builderHref: "/dashboard/shop",
        emptyMessage: "Add a product before choosing the featured item.",
      },
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

function allowedOptions(
  question: Exclude<ProfileQuestion, { kind: "content-review" | "boolean" }>,
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
  const questions = getVisibleProfileQuestions(input.templateId, input.answers);
  const allFields = new Set<string>(
    getProfileQuestionSet(input.templateId).questions.flatMap((question) =>
      "field" in question ? [question.field] : [],
    ),
  );
  const fieldErrors: Record<string, string> = {};

  for (const key of Object.keys(input.answers)) {
    if (!allFields.has(key))
      fieldErrors[key] = "This answer is not part of the selected template.";
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
      allowedOptions(question, input.contentOptions).map(({ id }) => id),
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
    : { success: true, answers: { ...input.answers } };
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
        value: "Existing profile content retained",
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
    const options = allowedOptions(question, input.contentOptions);
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
