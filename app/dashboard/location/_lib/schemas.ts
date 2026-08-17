import { z } from "zod";

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
      message: `${label} contains unsupported characters`,
    });
const optional = z
  .string()
  .trim()
  .max(150)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
    message: "Contains unsupported characters",
  });
export const locationFieldsSchema = z
  .object({
    businessName: text("Business name", 150),
    fullAddress: text("Address", 300),
    country: optional,
    city: text("City", 150),
    area: optional,
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();

const locationImageUrlSchema = z
  .string()
  .trim()
  .url("Location image URL is invalid")
  .refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
    );
  }, "Location image URL is invalid");

const locationMediaFields = {
  imageUrl: locationImageUrlSchema.nullable(),
  imageAlt: z
    .string()
    .trim()
    .max(180)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
      message: "Alternative text contains unsupported characters",
    }),
  imageDecorative: z.boolean(),
};

function refineLocationMedia(
  value: {
    imageUrl: string | null;
    imageAlt: string;
    imageDecorative: boolean;
  },
  context: z.RefinementCtx,
) {
  if (!value.imageUrl && !value.imageDecorative) {
    context.addIssue({
      code: "custom",
      path: ["imageDecorative"],
      message: "A location without an image must be decorative",
    });
  }
  if (value.imageDecorative && value.imageAlt) {
    context.addIssue({
      code: "custom",
      path: ["imageAlt"],
      message: "Decorative images must have empty alternative text",
    });
  }
  if (value.imageUrl && !value.imageDecorative && !value.imageAlt) {
    context.addIssue({
      code: "custom",
      path: ["imageAlt"],
      message: "Describe the location image or mark it as decorative",
    });
  }
}

export const locationMediaDraftSchema = z
  .object({
    hasImage: z.boolean(),
    imageAlt: locationMediaFields.imageAlt,
    imageDecorative: z.boolean(),
  })
  .strict()
  .superRefine((value, context) =>
    refineLocationMedia(
      {
        imageUrl: value.hasImage
          ? "https://pending.invalid/location.webp"
          : null,
        imageAlt: value.imageAlt,
        imageDecorative: value.imageDecorative,
      },
      context,
    ),
  );

export const locationTitleSchema = z
  .object({ title: text("Location title", 100) })
  .strict();

const locationMutationFields = {
  ...locationFieldsSchema.shape,
  ...locationMediaFields,
};

export const createLocationSchema = z
  .object({
    ...locationMutationFields,
    id: z.string().uuid(),
  })
  .strict()
  .superRefine(refineLocationMedia);
export const updateLocationSchema = z
  .object({
    ...locationMutationFields,
    id: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine(refineLocationMedia);
export const deleteLocationSchema = z
  .object({ id: z.string().uuid() })
  .strict();
export type LocationTitleInput = z.infer<typeof locationTitleSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type DeleteLocationInput = z.infer<typeof deleteLocationSchema>;
