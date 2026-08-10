import { z } from "zod";

const entityId = z.number().int().positive();
const title = z.string().trim().min(1, "Title is required").max(100);
const imageUrl = z
  .string()
  .trim()
  .min(1, "Image is required")
  .max(2048)
  .url("Image URL is invalid")
  .refine((value) => /^https?:\/\//i.test(value), "Image URL is invalid");
const legacyImagePath = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) =>
      /^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) && !value.includes(".."),
    "Image path is invalid",
  );
const existingImageUrl = imageUrl.or(legacyImagePath);
const label = z.string().trim().max(50);
const orderedIds = z
  .array(entityId)
  .refine((ids) => new Set(ids).size === ids.length, "IDs must be unique");

export const createDentalGallerySchema = z
  .object({
    title,
    beforeImageUrl: imageUrl,
    afterImageUrl: imageUrl,
    beforeLabel: label,
    afterLabel: label,
  })
  .strict();
export const updateDentalGallerySchema = createDentalGallerySchema
  .extend({
    id: entityId,
    beforeImageUrl: existingImageUrl,
    afterImageUrl: existingImageUrl,
    enabled: z.boolean(),
  })
  .strict();
export const deleteDentalGallerySchema = z.object({ id: entityId }).strict();
export const reorderDentalGalleriesSchema = z.object({ orderedIds }).strict();

export const createGeneralGallerySchema = z
  .object({ title, imageUrl })
  .strict();
export const updateGeneralGallerySchema = createGeneralGallerySchema
  .extend({ id: entityId, imageUrl: existingImageUrl, enabled: z.boolean() })
  .strict();
export const deleteGeneralGallerySchema = z.object({ id: entityId }).strict();
export const reorderGeneralGalleriesSchema = z.object({ orderedIds }).strict();

export type CreateDentalGalleryInput = z.infer<
  typeof createDentalGallerySchema
>;
export type UpdateDentalGalleryInput = z.infer<
  typeof updateDentalGallerySchema
>;
export type DeleteDentalGalleryInput = z.infer<
  typeof deleteDentalGallerySchema
>;
export type ReorderDentalGalleriesInput = z.infer<
  typeof reorderDentalGalleriesSchema
>;
export type CreateGeneralGalleryInput = z.infer<
  typeof createGeneralGallerySchema
>;
export type UpdateGeneralGalleryInput = z.infer<
  typeof updateGeneralGallerySchema
>;
export type DeleteGeneralGalleryInput = z.infer<
  typeof deleteGeneralGallerySchema
>;
export type ReorderGeneralGalleriesInput = z.infer<
  typeof reorderGeneralGalleriesSchema
>;
