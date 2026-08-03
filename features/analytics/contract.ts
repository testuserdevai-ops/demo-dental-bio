import { z } from "zod";

export const ANALYTICS_SCHEMA_VERSION = 1 as const;

const idSchema = z.string().uuid();
const positionSchema = z.number().int().positive();

export const publicSectionSchema = z.enum([
  "header",
  "profile",
  "navigation",
  "links",
  "treatments",
  "services",
  "blogs",
  "videos",
  "gallery",
  "reviews",
  "shop",
  "locations",
  "footer",
  "share",
]);

export const consentStateSchema = z.enum([
  "unknown",
  "granted",
  "denied",
  "not_required",
]);

export const publicRenderContextSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("public") }).strict(),
  z
    .object({
      kind: z.literal("preview"),
      verification: z.literal("authenticated_profile_owner"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("test"),
      verification: z.literal("signed_test_context"),
      proof: z.string().min(32).max(512),
    })
    .strict(),
]);

const entityActionSchemas = [
  z
    .object({
      type: z.literal("link_click"),
      linkId: idSchema,
      groupId: idSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("blog_click"),
      blogId: idSchema,
      groupId: idSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("video_open"),
      videoId: idSchema,
      groupId: idSchema.optional(),
    })
    .strict(),
  z.object({ type: z.literal("gallery_open"), galleryId: idSchema }).strict(),
  z.object({ type: z.literal("product_click"), productId: idSchema }).strict(),
  z
    .object({
      type: z.literal("external_review_click"),
      reviewPageId: idSchema.optional(),
    })
    .strict(),
  z
    .object({ type: z.literal("treatment_expand"), treatmentId: idSchema })
    .strict(),
  z
    .object({ type: z.literal("treatment_cta_click"), treatmentId: idSchema })
    .strict(),
  z
    .object({ type: z.literal("service_expand"), treatmentId: idSchema })
    .strict(),
  z
    .object({ type: z.literal("service_cta_click"), treatmentId: idSchema })
    .strict(),
] as const;

export const publicActionSchema = z.discriminatedUnion("type", [
  ...entityActionSchemas,
  z
    .object({
      type: z.literal("cta_click"),
      ctaType: z.enum(["booking", "directions", "email", "phone", "enquiry"]),
      locationId: idSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("booking_click"),
      locationId: idSchema.optional(),
    })
    .strict(),
  z
    .object({ type: z.literal("directions_click"), locationId: idSchema })
    .strict(),
  z
    .object({ type: z.literal("email_click"), locationId: idSchema.optional() })
    .strict(),
  z
    .object({ type: z.literal("phone_click"), locationId: idSchema.optional() })
    .strict(),
  z
    .object({
      type: z.literal("social_click"),
      platform: z.enum(["instagram", "tiktok", "x", "facebook", "website"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("share_click"),
      channel: z.enum([
        "copy",
        "linkedin",
        "facebook",
        "whatsapp",
        "messenger",
        "email",
      ]),
    })
    .strict(),
  z.object({ type: z.literal("share_open") }).strict(),
  z
    .object({
      type: z.literal("navigation_click"),
      destination: z.enum([
        "links",
        "blog",
        "gallery",
        "video",
        "review",
        "location",
        "shop",
      ]),
    })
    .strict(),
  z.object({ type: z.literal("enquiry_start") }).strict(),
  z.object({ type: z.literal("enquiry_submit") }).strict(),
]);

const attributionSchema = z
  .object({
    referrerDomain: z
      .string()
      .max(253)
      .regex(
        /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/,
      )
      .optional(),
    source: z
      .enum(["direct", "search", "social", "referral", "campaign"])
      .optional(),
    utmSource: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,64}$/)
      .optional(),
    utmMedium: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,64}$/)
      .optional(),
    utmCampaign: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,96}$/)
      .optional(),
    campaignId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,96}$/)
      .optional(),
  })
  .strict();

const privacySafeClientSchema = z
  .object({
    anonymousVisitorId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{16,128}$/)
      .optional(),
    sessionId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{16,128}$/)
      .optional(),
    deviceClass: z.enum(["mobile", "tablet", "desktop", "unknown"]),
  })
  .strict();

export const analyticsEventSchema = z
  .object({
    schemaVersion: z.literal(ANALYTICS_SCHEMA_VERSION),
    eventId: z.string().uuid(),
    eventType: z.literal("public_action"),
    occurredAt: z.string().datetime({ offset: true }),
    profileId: idSchema,
    section: publicSectionSchema,
    position: positionSchema.optional(),
    renderContext: publicRenderContextSchema,
    consent: consentStateSchema,
    attribution: attributionSchema.optional(),
    client: privacySafeClientSchema.optional(),
    action: publicActionSchema,
  })
  .strict();

export type PublicSection = z.infer<typeof publicSectionSchema>;
export type ConsentState = z.infer<typeof consentStateSchema>;
export type PublicRenderContext = z.infer<typeof publicRenderContextSchema>;
export type PublicActionDescriptor = z.infer<typeof publicActionSchema>;
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

export type TrackableAction = {
  action: PublicActionDescriptor;
  section: PublicSection;
  position?: number;
};
