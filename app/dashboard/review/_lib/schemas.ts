import { z } from "zod";
import { externalReviewSectionTitleSchema } from "@/lib/public-profile/external-review-title";

const id = z.number().int().positive();
const optionalImageUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "Image URL is invalid")
  .or(z.literal(""));
const legacyImagePath = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) =>
      /^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) && !value.includes(".."),
    "Image path is invalid",
  );
const orderedIds = z
  .array(id)
  .refine((ids) => new Set(ids).size === ids.length, "IDs must be unique");
const externalReviewLink = z
  .string()
  .trim()
  .min(1, "External review page URL is required")
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      const hostnameIsSafe =
        /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(url.hostname) &&
        !url.hostname.includes("..") &&
        !url.hostname.includes(".-") &&
        !url.hostname.includes("-.");
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        hostnameIsSafe &&
        !/[\u0000-\u0020\u007f\\]/.test(value)
      );
    } catch {
      return false;
    }
  }, "Enter a credential-free HTTPS URL")
  .transform((value) => new URL(value).toString());
const fields = z
  .object({
    reviewerName: z
      .string()
      .trim()
      .min(1, "Reviewer name is required")
      .max(100),
    content: z.string().trim().min(1, "Review content is required").max(500),
    stars: z.number().int().min(1).max(5),
    imageUrl: optionalImageUrl,
    platform: z.string().trim().min(1, "Platform is required").max(50),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const createReviewSchema = fields;
export const updateReviewSchema = fields
  .extend({
    id,
    imageUrl: optionalImageUrl.or(legacyImagePath),
    enabled: z.boolean(),
  })
  .strict();
export const deleteReviewSchema = z.object({ id }).strict();
export const reorderReviewsSchema = z.object({ orderedIds }).strict();
export const createExternalReviewPageSchema = z
  .object({ link: externalReviewLink })
  .strict();
export const updateExternalReviewPageSchema = z
  .object({ id, link: externalReviewLink, enabled: z.boolean() })
  .strict();
export const deleteExternalReviewPageSchema = z.object({ id }).strict();
export const reorderExternalReviewPagesSchema = z
  .object({ orderedIds })
  .strict();
export { externalReviewSectionTitleSchema };

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type DeleteReviewInput = z.infer<typeof deleteReviewSchema>;
export type ReorderReviewsInput = z.infer<typeof reorderReviewsSchema>;
export type CreateExternalReviewPageInput = z.infer<
  typeof createExternalReviewPageSchema
>;
export type UpdateExternalReviewPageInput = z.infer<
  typeof updateExternalReviewPageSchema
>;
export type DeleteExternalReviewPageInput = z.infer<
  typeof deleteExternalReviewPageSchema
>;
export type ReorderExternalReviewPagesInput = z.infer<
  typeof reorderExternalReviewPagesSchema
>;
export type ExternalReviewSectionTitleInput = z.infer<
  typeof externalReviewSectionTitleSchema
>;
