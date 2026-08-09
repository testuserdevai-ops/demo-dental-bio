import { z } from "zod";

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
export const externalReviewPageSchema = z
  .object({
    link: z
      .string()
      .trim()
      .max(2048)
      .url("Enter a valid HTTPS URL")
      .refine((value) => /^https:\/\//i.test(value), "Enter a valid HTTPS URL")
      .or(z.literal("")),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type DeleteReviewInput = z.infer<typeof deleteReviewSchema>;
export type ReorderReviewsInput = z.infer<typeof reorderReviewsSchema>;
export type ExternalReviewPageInput = z.infer<typeof externalReviewPageSchema>;
