import { z } from "zod";
import { linkImageVariantSchema } from "@/lib/public-profile/link-presentation";

const id = z.string().uuid();
const normalizeUrl = (value: string) =>
  /^https?:\/\//i.test(value) ? value : `https://${value}`;
const url = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    try {
      const parsed = new URL(normalizeUrl(value));
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a valid HTTP(S) URL")
  .transform(normalizeUrl);
const group = z.object({ heading: z.string().trim().min(1).max(100) }).strict();
const linkFields = {
  title: z.string().trim().min(1).max(100),
  url,
  isActive: z.boolean(),
  imageUrl: z.string().trim().url().max(2048).nullable(),
  imageVariant: linkImageVariantSchema,
  imageAlt: z.string().trim().min(1).max(180).nullable(),
  imageDecorative: z.boolean(),
  isFeatured: z.boolean(),
} as const;
type LinkMediaValues = z.infer<z.ZodObject<typeof linkFields>>;
const validateLinkMedia = (
  value: LinkMediaValues,
  context: z.RefinementCtx,
  requirePersistedImage = true,
) => {
  if (value.imageVariant === "none") {
    if (
      value.imageUrl !== null ||
      value.imageAlt !== null ||
      !value.imageDecorative
    ) {
      context.addIssue({
        code: "custom",
        path: ["imageVariant"],
        message: "Text-only links cannot retain image details",
      });
    }
    return;
  }
  if (requirePersistedImage && !value.imageUrl) {
    context.addIssue({
      code: "custom",
      path: ["imageUrl"],
      message: "Upload an image for this layout",
    });
  }
  if (value.imageDecorative && value.imageAlt !== null) {
    context.addIssue({
      code: "custom",
      path: ["imageAlt"],
      message: "Decorative images must have empty alt text",
    });
  }
  if (!value.imageDecorative && value.imageAlt === null) {
    context.addIssue({
      code: "custom",
      path: ["imageAlt"],
      message: "Describe informative images",
    });
  }
};
export const linkFormInputSchema = z
  .object(linkFields)
  .strict()
  .superRefine((value, context) => validateLinkMedia(value, context, false));
const orderedIds = z
  .array(id)
  .min(1)
  .refine(
    (values) => new Set(values).size === values.length,
    "IDs must be unique",
  );

export const createLinkGroupInputSchema = group;
export const updateLinkGroupInputSchema = group
  .extend({ linkGroupId: id })
  .strict();
export const deleteLinkGroupInputSchema = z
  .object({ linkGroupId: id })
  .strict();
export const reorderLinkGroupsInputSchema = z.object({ orderedIds }).strict();
export const createLinkInputSchema = z
  .object({ ...linkFields, linkGroupId: id })
  .strict()
  .superRefine((value, context) => validateLinkMedia(value, context));
export const updateLinkInputSchema = z
  .object({ ...linkFields, linkId: id, linkGroupId: id })
  .strict()
  .superRefine((value, context) => validateLinkMedia(value, context));
export const deleteLinkInputSchema = z
  .object({ linkId: id, linkGroupId: id })
  .strict();
export const reorderLinksInputSchema = z
  .object({ linkGroupId: id, orderedIds })
  .strict();
export type CreateLinkGroupInput = z.infer<typeof createLinkGroupInputSchema>;
export type UpdateLinkGroupInput = z.infer<typeof updateLinkGroupInputSchema>;
export type DeleteLinkGroupInput = z.infer<typeof deleteLinkGroupInputSchema>;
export type ReorderLinkGroupsInput = z.infer<
  typeof reorderLinkGroupsInputSchema
>;
export type CreateLinkInput = z.infer<typeof createLinkInputSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkInputSchema>;
export type DeleteLinkInput = z.infer<typeof deleteLinkInputSchema>;
export type ReorderLinksInput = z.infer<typeof reorderLinksInputSchema>;
