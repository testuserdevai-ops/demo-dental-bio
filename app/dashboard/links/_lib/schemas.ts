import { z } from "zod";

const id = z.string().uuid();
const url = z
  .string()
  .trim()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "URL must use HTTP(S)");
const group = z.object({ heading: z.string().trim().min(1).max(100) }).strict();
const link = z
  .object({
    title: z.string().trim().min(1).max(100),
    url,
    isActive: z.boolean(),
  })
  .strict();
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
export const createLinkInputSchema = link.extend({ linkGroupId: id }).strict();
export const updateLinkInputSchema = link
  .extend({ linkId: id, linkGroupId: id })
  .strict();
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
