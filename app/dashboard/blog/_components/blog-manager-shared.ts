import { z } from "zod";
import type { useBlogMutations } from "../_lib/hooks";
import type { BlogGroupViewModel, BlogViewModel } from "../_lib/queries";

export type BlogMutations = ReturnType<typeof useBlogMutations>;
export type BlogEditor =
  | { kind: "group"; group?: BlogGroupViewModel }
  | { kind: "blog"; group: BlogGroupViewModel; blog?: BlogViewModel };
export type BlogDeleteTarget =
  | { kind: "group"; group: BlogGroupViewModel }
  | { kind: "blog"; group: BlogGroupViewModel; blog: BlogViewModel };

export const groupFormSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100),
});
const optionalFile = z.custom<File>(
  (value) =>
    value === undefined ||
    (typeof File !== "undefined" && value instanceof File),
  "Choose a valid image",
);
export const blogFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  slug: z
    .string()
    .trim()
    .max(100)
    .regex(
      /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
      "Use letters, numbers, and hyphens",
    )
    .or(z.literal("")),
  content: z.string().trim().min(1, "Content is required").max(50_000),
  metaTitle: z.string().trim().max(160),
  metaDescription: z.string().trim().max(320),
  imageFile: optionalFile.optional(),
});
export type GroupValues = z.infer<typeof groupFormSchema>;
export type BlogValues = z.infer<typeof blogFormSchema>;

export function move<T>(items: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const changed = [...items];
  const [item] = changed.splice(index, 1);
  changed.splice(next, 0, item);
  return changed;
}

export function same(left: { id: number }[], right: { id: number }[]) {
  return left.map(({ id }) => id).join() === right.map(({ id }) => id).join();
}
