import { z } from "zod";

import {
  PROFILE_LAYOUT_CATALOG,
  PROFILE_LAYOUT_VARIANTS,
  PROFILE_PRESENTATION_SCHEMA_VERSION,
  PROFILE_TEMPLATE_CATALOG,
  PROFILE_TEMPLATE_IDS,
  PROFILE_THEME_CATALOG,
  PROFILE_THEME_IDS,
  type ProfileLayoutVariant,
  type ProfilePresentationTier,
  type ProfileTemplateId,
  type ProfileThemeId,
} from "./catalog";

const entityIdSchema = z
  .string()
  .max(64)
  .refine(
    (value) => /^[1-9]\d*$/.test(value) || z.uuid().safeParse(value).success,
    "Entity IDs must be a positive integer or UUID encoded as a string",
  );

const entityIdList = (maximum: number) =>
  z
    .array(entityIdSchema)
    .max(maximum)
    .refine((ids) => {
      return new Set(ids).size === ids.length;
    }, "Entity IDs must be unique");

const actionKindSchema = z.enum([
  "booking",
  "assessment",
  "website",
  "whatsapp",
  "phone",
  "email",
]);

const answerSchemas = {
  basic: z.object({}).strict(),
  "direct-booking": z
    .object({
      primaryAction: actionKindSchema.optional(),
      secondaryAction: actionKindSchema.optional(),
      featuredTreatmentIds: entityIdList(3).optional(),
    })
    .strict(),
  "location-provider-router": z
    .object({
      routerKind: z
        .enum(["location", "provider", "appointment-type"])
        .optional(),
      defaultLocationId: entityIdSchema.optional(),
    })
    .strict(),
  "services-catalogue": z
    .object({
      featuredTreatmentIds: entityIdList(3).optional(),
      showFinancingBeforeTeam: z.boolean().optional(),
    })
    .strict(),
  "cosmetic-transformation": z
    .object({
      signatureTreatmentId: entityIdSchema.optional(),
      consultationKind: z.enum(["in-person", "virtual", "free"]).optional(),
      featuredGalleryIds: entityIdList(6).optional(),
      featuredReviewIds: entityIdList(3).optional(),
    })
    .strict(),
  "trust-first-family-practice": z
    .object({
      featuredReviewIds: entityIdList(2).optional(),
      priorityInformation: z
        .array(
          z.enum(["payment", "insurance", "accessibility", "anxiety-care"]),
        )
        .max(4)
        .optional(),
    })
    .strict(),
  "specialist-assessment": z
    .object({
      primaryPath: z.enum(["assessment", "consultation"]).optional(),
      referralRequired: z.boolean().optional(),
      showEmergencyFirst: z.boolean().optional(),
    })
    .strict(),
  "expert-educator": z
    .object({
      defaultAudience: z.enum(["patients", "professionals"]).optional(),
      featuredContentId: entityIdSchema.optional(),
    })
    .strict(),
  "clinic-commerce": z
    .object({
      defaultAudience: z.enum(["clinic", "shop"]).optional(),
      featuredProductId: entityIdSchema.optional(),
    })
    .strict(),
} as const satisfies Record<ProfileTemplateId, z.ZodType>;

const profileTemplateIdSchema = z.enum(PROFILE_TEMPLATE_IDS);
const profileThemeIdSchema = z.enum(PROFILE_THEME_IDS);
const profileLayoutVariantSchema = z.enum(PROFILE_LAYOUT_VARIANTS);

const configurationEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(PROFILE_PRESENTATION_SCHEMA_VERSION),
    templateId: profileTemplateIdSchema,
    themeId: profileThemeIdSchema,
    layoutVariant: profileLayoutVariantSchema,
    answers: z.record(z.string(), z.unknown()),
  })
  .strict();

const legacyConfigurationSchema = z
  .object({
    schema_version: z.literal(0),
    template_id: profileTemplateIdSchema.optional(),
    theme_id: profileThemeIdSchema.optional(),
    layout_variant: profileLayoutVariantSchema.optional(),
    answers: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ProfileTemplateAnswers = {
  [TemplateId in ProfileTemplateId]: z.infer<
    (typeof answerSchemas)[TemplateId]
  >;
};

export type ProfilePresentationConfiguration<
  TemplateId extends ProfileTemplateId = ProfileTemplateId,
> = {
  schemaVersion: typeof PROFILE_PRESENTATION_SCHEMA_VERSION;
  templateId: TemplateId;
  themeId: ProfileThemeId;
  layoutVariant: ProfileLayoutVariant;
  answers: ProfileTemplateAnswers[TemplateId];
};

export type ProfilePresentationEntitlement = {
  tier: ProfilePresentationTier;
};

export const DEFAULT_PROFILE_PRESENTATION_CONFIGURATION = {
  schemaVersion: PROFILE_PRESENTATION_SCHEMA_VERSION,
  templateId: "basic",
  themeId: "clinical-light",
  layoutVariant: "classic-stack",
  answers: {},
} as const satisfies ProfilePresentationConfiguration<"basic">;

function migrateLegacyConfiguration(
  value: unknown,
): ProfilePresentationConfiguration | unknown {
  const legacy = legacyConfigurationSchema.safeParse(value);
  if (!legacy.success) return value;

  return {
    schemaVersion: PROFILE_PRESENTATION_SCHEMA_VERSION,
    templateId: legacy.data.template_id ?? "basic",
    themeId: legacy.data.theme_id ?? "clinical-light",
    layoutVariant: legacy.data.layout_variant ?? "classic-stack",
    answers: legacy.data.answers ?? {},
  };
}

function hasTier(
  entitlement: ProfilePresentationEntitlement,
  required: ProfilePresentationTier,
) {
  return required === "free" || entitlement.tier === "pro";
}

export function parseProfilePresentationConfiguration(
  value: unknown,
  entitlement: ProfilePresentationEntitlement,
): ProfilePresentationConfiguration {
  const envelope = configurationEnvelopeSchema.parse(
    migrateLegacyConfiguration(value),
  );
  const answers = answerSchemas[envelope.templateId].parse(envelope.answers);
  const template = PROFILE_TEMPLATE_CATALOG[envelope.templateId];
  const theme = PROFILE_THEME_CATALOG[envelope.themeId];
  const layout = PROFILE_LAYOUT_CATALOG[envelope.layoutVariant];

  const allowedLayouts: readonly ProfileLayoutVariant[] =
    template.allowedLayouts;
  if (!allowedLayouts.includes(envelope.layoutVariant)) {
    throw new Error(
      `Layout ${envelope.layoutVariant} is not supported by ${envelope.templateId}`,
    );
  }
  if (!hasTier(entitlement, template.minimumTier)) {
    throw new Error(`Template ${envelope.templateId} requires a paid plan`);
  }
  if (!hasTier(entitlement, theme.minimumTier)) {
    throw new Error(`Theme ${envelope.themeId} requires a paid plan`);
  }
  if (!hasTier(entitlement, layout.minimumTier)) {
    throw new Error(`Layout ${envelope.layoutVariant} requires a paid plan`);
  }

  return { ...envelope, answers } as ProfilePresentationConfiguration;
}

export type ProfilePresentationResolutionReason =
  | "valid"
  | "missing"
  | "malformed"
  | "unsupported-version"
  | "entitlement-fallback";

export type ResolvedProfilePresentation = {
  configuration: ProfilePresentationConfiguration;
  reason: ProfilePresentationResolutionReason;
};

export function resolveProfilePresentationConfiguration(
  value: unknown,
  entitlement: ProfilePresentationEntitlement,
): ResolvedProfilePresentation {
  if (value === null || value === undefined) {
    return {
      configuration: DEFAULT_PROFILE_PRESENTATION_CONFIGURATION,
      reason: "missing",
    };
  }

  const schemaVersion =
    typeof value === "object" && value !== null && "schemaVersion" in value
      ? (value as { schemaVersion?: unknown }).schemaVersion
      : undefined;
  if (
    typeof schemaVersion === "number" &&
    schemaVersion > PROFILE_PRESENTATION_SCHEMA_VERSION
  ) {
    return {
      configuration: DEFAULT_PROFILE_PRESENTATION_CONFIGURATION,
      reason: "unsupported-version",
    };
  }

  try {
    return {
      configuration: parseProfilePresentationConfiguration(value, entitlement),
      reason: "valid",
    };
  } catch {
    try {
      const paidConfiguration = parseProfilePresentationConfiguration(value, {
        tier: "pro",
      });
      const template = PROFILE_TEMPLATE_CATALOG[paidConfiguration.templateId];
      const layoutVariant = template.allowedLayouts.includes("classic-stack")
        ? "classic-stack"
        : DEFAULT_PROFILE_PRESENTATION_CONFIGURATION.layoutVariant;

      return {
        configuration: {
          ...paidConfiguration,
          themeId: "clinical-light",
          layoutVariant,
        },
        reason: "entitlement-fallback",
      };
    } catch {
      return {
        configuration: DEFAULT_PROFILE_PRESENTATION_CONFIGURATION,
        reason: "malformed",
      };
    }
  }
}

export function deriveProfilePresentationEntitlement(
  user: {
    subscription_status: string | null;
    trial_end: string | null;
  },
  now = new Date(),
): ProfilePresentationEntitlement {
  const paid =
    user.subscription_status === "PRO" ||
    user.subscription_status === "PREMIUM PRO";
  const activeTrial =
    user.trial_end !== null &&
    new Date(user.trial_end).getTime() > now.getTime();

  return { tier: paid || activeTrial ? "pro" : "free" };
}
