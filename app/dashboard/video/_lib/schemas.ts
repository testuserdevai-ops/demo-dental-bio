import { z } from "zod";
import { videoSchema } from "@/lib/validation";

const id = z.number().int().positive();
const name = z.string().trim().min(1, "Group name is required").max(100);
const orderedIds = z
  .array(id)
  .refine(
    (items) => new Set(items).size === items.length,
    "IDs must be unique",
  );
const videoFields = {
  groupId: id,
  title: videoSchema.shape.title,
  link: videoSchema.shape.link,
  enabled: z.boolean(),
};
export const createVideoGroupSchema = z.object({ name }).strict();
export const updateVideoGroupSchema = z
  .object({ id, name, enabled: z.boolean() })
  .strict();
export const deleteVideoGroupSchema = z.object({ id }).strict();
export const reorderVideoGroupsSchema = z.object({ orderedIds }).strict();
export const createVideoSchema = z.object(videoFields).strict();
export const updateVideoSchema = z.object({ ...videoFields, id }).strict();
export const deleteVideoSchema = z.object({ id }).strict();
export const reorderVideosSchema = z
  .object({ groupId: id, orderedIds })
  .strict();
export type CreateVideoGroupInput = z.infer<typeof createVideoGroupSchema>;
export type UpdateVideoGroupInput = z.infer<typeof updateVideoGroupSchema>;
export type DeleteVideoGroupInput = z.infer<typeof deleteVideoGroupSchema>;
export type ReorderVideoGroupsInput = z.infer<typeof reorderVideoGroupsSchema>;
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type DeleteVideoInput = z.infer<typeof deleteVideoSchema>;
export type ReorderVideosInput = z.infer<typeof reorderVideosSchema>;
