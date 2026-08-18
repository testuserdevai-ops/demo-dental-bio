import { z } from "zod";

const titleSchema = z
  .string()
  .trim()
  .max(100, "External review section title must be 100 characters or fewer")
  .refine(
    (value) => !/[\u0000-\u001f\u007f-\u009f]/u.test(value),
    "External review section title must be plain text",
  );

export const externalReviewSectionTitleSchema = z
  .object({
    externalReviewSectionTitle: titleSchema,
  })
  .strict();

export type ExternalReviewSectionTitleInput = z.infer<
  typeof externalReviewSectionTitleSchema
>;

export function resolveExternalReviewSectionTitle(
  value: unknown,
): string | null {
  const parsed = titleSchema.safeParse(value);
  if (!parsed.success || parsed.data.length === 0) return null;
  return parsed.data;
}
