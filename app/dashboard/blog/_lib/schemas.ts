import { z } from "zod";

const id = z.number().int().positive();
const name = z.string().trim().min(1, "Group name is required").max(100);
const title = z.string().trim().min(1, "Title is required").max(150);
const content = z.string().trim().min(1, "Content is required").max(50_000);
const slug = z
  .string()
  .trim()
  .max(100)
  .regex(
    /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
    "Use letters, numbers, and hyphens",
  )
  .or(z.literal(""));
const imageUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => !value || /^https?:\/\//i.test(value),
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
const orderedIds = z
  .array(id)
  .refine(
    (items) => new Set(items).size === items.length,
    "IDs must be unique",
  );

export const createBlogGroupSchema = z.object({ name }).strict();
export const updateBlogGroupSchema = z
  .object({ id, name, enabled: z.boolean() })
  .strict();
export const deleteBlogGroupSchema = z.object({ id }).strict();
export const reorderBlogGroupsSchema = z.object({ orderedIds }).strict();

const blogFields = {
  title,
  content,
  metaTitle: z.string().trim().max(160),
  metaDescription: z.string().trim().max(320),
  slug,
  imageUrl,
  enabled: z.boolean(),
};
export const createBlogSchema = z
  .object({ ...blogFields, groupId: id })
  .strict();
export const updateBlogSchema = z
  .object({
    ...blogFields,
    id,
    imageUrl: existingImageUrl,
  })
  .strict();
export const deleteBlogSchema = z.object({ id }).strict();
export const reorderBlogsSchema = z
  .object({ groupId: id, orderedIds })
  .strict();

export type CreateBlogGroupInput = z.infer<typeof createBlogGroupSchema>;
export type UpdateBlogGroupInput = z.infer<typeof updateBlogGroupSchema>;
export type DeleteBlogGroupInput = z.infer<typeof deleteBlogGroupSchema>;
export type ReorderBlogGroupsInput = z.infer<typeof reorderBlogGroupsSchema>;
export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
export type DeleteBlogInput = z.infer<typeof deleteBlogSchema>;
export type ReorderBlogsInput = z.infer<typeof reorderBlogsSchema>;
