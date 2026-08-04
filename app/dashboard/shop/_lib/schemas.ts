import { z } from "zod";
import { currencies } from "@/utils/global_constants";

const id = z.number().int().positive();
const imageUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine(
    (value) =>
      value.startsWith("https://") || value.startsWith("http://127.0.0.1:"),
    "Image URL is invalid",
  );
const existingImageUrl = imageUrl.or(
  z
    .string()
    .trim()
    .max(2048)
    .refine(
      (value) =>
        /^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) && !value.includes(".."),
      "Image path is invalid",
    ),
);
const fields = {
  name: z.string().trim().min(1, "Name is required").max(150),
  link: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(2048)
    .refine((value) => value.startsWith("https://"), "Use an HTTPS URL"),
  platform: z.string().trim().min(1, "Platform is required").max(100),
  imageUrl,
  price: z.coerce.number().finite().nonnegative().max(1_000_000),
  currency: z
    .string()
    .refine((value) => currencies.includes(value), "Choose a valid currency"),
  enabled: z.boolean(),
};
export const createProductSchema = z.object(fields).strict();
export const updateProductSchema = z
  .object({ ...fields, id, imageUrl: existingImageUrl })
  .strict();
export const deleteProductSchema = z.object({ id }).strict();
export const reorderProductsSchema = z
  .object({
    orderedIds: z
      .array(id)
      .refine(
        (items) => items.length === new Set(items).size,
        "IDs must be unique",
      ),
  })
  .strict();
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
export type ReorderProductsInput = z.infer<typeof reorderProductsSchema>;
