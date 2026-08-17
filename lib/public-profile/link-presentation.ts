import { z } from "zod";

export const LINK_IMAGE_VARIANTS = [
  "none",
  "small-icon",
  "large-image",
] as const;

export const linkImageVariantSchema = z.enum(LINK_IMAGE_VARIANTS);

const imageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Image URL must use HTTP(S)");

const noImagePresentationSchema = z
  .object({
    variant: z.literal("none"),
    imageUrl: z.null(),
    imageAlt: z.null(),
    decorative: z.literal(true),
    featured: z.boolean(),
  })
  .strict();

const imagePresentationSchema = z
  .object({
    variant: z.enum(["small-icon", "large-image"]),
    imageUrl: imageUrlSchema,
    imageAlt: z.string().trim().min(1).max(180).nullable(),
    decorative: z.boolean(),
    featured: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decorative && value.imageAlt !== null) {
      context.addIssue({
        code: "custom",
        path: ["imageAlt"],
        message: "Decorative images must have empty alt text",
      });
    }
    if (!value.decorative && value.imageAlt === null) {
      context.addIssue({
        code: "custom",
        path: ["imageAlt"],
        message: "Informative images need alt text",
      });
    }
  });

export const publicLinkPresentationSchema = z.union([
  noImagePresentationSchema,
  imagePresentationSchema,
]);

export type PublicLinkPresentation = z.infer<
  typeof publicLinkPresentationSchema
>;
export type LinkImageVariant = z.infer<typeof linkImageVariantSchema>;

export const DEFAULT_PUBLIC_LINK_PRESENTATION = {
  variant: "none",
  imageUrl: null,
  imageAlt: null,
  decorative: true,
  featured: false,
} as const satisfies PublicLinkPresentation;

/** Fail closed to a navigable text link when persisted media is incomplete. */
export function resolvePublicLinkPresentation(
  value: unknown,
): PublicLinkPresentation {
  const parsed = publicLinkPresentationSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_PUBLIC_LINK_PRESENTATION;
}
