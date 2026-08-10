import type { useLinkMutations } from "../_lib/hooks";

export type LinkMutations = ReturnType<typeof useLinkMutations>;

export const GROUP_ITEM_TYPE = "link-group";
export const LINK_ITEM_TYPE = "link-item";

export function moveItem<T>(items: T[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const updated = [...items];
  const [moved] = updated.splice(from, 1);
  updated.splice(to, 0, moved);
  return updated;
}
