import { z } from "zod";
import { videoSchema } from "@/lib/validation";
import type { useVideoMutations } from "../_lib/hooks";
import type { VideoGroupViewModel, VideoViewModel } from "../_lib/queries";

export type VideoMutations = ReturnType<typeof useVideoMutations>;
export type VideoEditor =
  | { kind: "group"; group?: VideoGroupViewModel }
  | { kind: "video"; group: VideoGroupViewModel; video?: VideoViewModel };
export type VideoDeleteTarget =
  | { kind: "group"; group: VideoGroupViewModel }
  | { kind: "video"; group: VideoGroupViewModel; video: VideoViewModel };
export const groupFormSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100),
});
export const editorSchema = z.object({
  title: videoSchema.shape.title,
  link: videoSchema.shape.link,
});
export type GroupValues = z.infer<typeof groupFormSchema>;
export type VideoValues = z.infer<typeof editorSchema>;

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
