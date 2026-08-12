import { z } from "zod";

export const ANALYTICS_SCHEMA_VERSION = 1 as const;

// Shared by Server and Client Components; keep this module browser-neutral.

const idSchema = z.string().uuid();
const entityIdSchema = z.union([idSchema, z.number().int().positive()]);
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
    })
    .strict(),
  z
    .object({
      kind: z.literal("admin_preview"),
      verification: z.literal("authenticated_admin"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("excluded"),
      reason: z.enum(["unverified_preview", "unverified_test"]),
    })
    .strict(),
]);

export const reportableRenderContextSchema = z.discriminatedUnion("kind", [
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
    })
    .strict(),
  z
    .object({
      kind: z.literal("admin_preview"),
      verification: z.literal("authenticated_admin"),
    })
    .strict(),
]);

const entityActionSchemas = [
  z
    .object({
      type: z.literal("link_click"),
      linkId: entityIdSchema,
      groupId: entityIdSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("blog_click"),
      blogId: entityIdSchema,
      groupId: entityIdSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("video_open"),
      videoId: entityIdSchema,
      groupId: entityIdSchema.optional(),
    })
    .strict(),
  z
    .object({ type: z.literal("gallery_open"), galleryId: entityIdSchema })
    .strict(),
  z
    .object({ type: z.literal("product_click"), productId: entityIdSchema })
    .strict(),
  z
    .object({
      type: z.literal("external_review_click"),
      reviewPageId: entityIdSchema.optional(),
    })
    .strict(),
  z
    .object({ type: z.literal("review_expand"), reviewId: entityIdSchema })
    .strict(),
  z
    .object({
      type: z.literal("treatment_expand"),
      treatmentId: entityIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("treatment_cta_click"),
      treatmentId: entityIdSchema,
    })
    .strict(),
  z
    .object({ type: z.literal("service_expand"), treatmentId: entityIdSchema })
    .strict(),
  z
    .object({
      type: z.literal("service_cta_click"),
      treatmentId: entityIdSchema,
    })
    .strict(),
] as const;

export const publicActionSchema = z.discriminatedUnion("type", [
  ...entityActionSchemas,
  z.object({ type: z.literal("profile_view") }).strict(),
  z
    .object({
      type: z.literal("cta_click"),
      ctaType: z.enum([
        "contact",
        "booking",
        "directions",
        "email",
        "phone",
        "enquiry",
      ]),
      locationId: entityIdSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("booking_click"),
      locationId: entityIdSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("directions_click"),
      locationId: entityIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("map_open"),
      locationId: entityIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("location_select"),
      locationId: entityIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("email_click"),
      locationId: entityIdSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("phone_click"),
      locationId: entityIdSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("social_click"),
      platform: z.enum([
        "instagram",
        "tiktok",
        "x",
        "facebook",
        "linkedin",
        "website",
      ]),
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
      locationId: entityIdSchema.optional(),
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
      .enum([
        "google",
        "bing",
        "facebook",
        "instagram",
        "linkedin",
        "tiktok",
        "email",
        "partner",
      ])
      .optional(),
    utmMedium: z
      .enum([
        "organic",
        "cpc",
        "paid_social",
        "social",
        "email",
        "referral",
        "display",
        "qr",
        "offline",
      ])
      .optional(),
    utmCampaign: z
      .enum(["brand", "booking", "profile", "seasonal", "partner"])
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
    renderContext: reportableRenderContextSchema,
    consent: consentStateSchema,
    attribution: attributionSchema.optional(),
    client: privacySafeClientSchema.optional(),
    action: publicActionSchema,
  })
  .strict();

export type PublicSection = z.infer<typeof publicSectionSchema>;
export type ConsentState = z.infer<typeof consentStateSchema>;
export type PublicRenderContext = z.infer<typeof publicRenderContextSchema>;
export type ReportableRenderContext = z.infer<
  typeof reportableRenderContextSchema
>;
export type PublicActionDescriptor = z.infer<typeof publicActionSchema>;
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

export type TrackableAction = {
  action: PublicActionDescriptor;
  section: PublicSection;
  position?: number;
};
