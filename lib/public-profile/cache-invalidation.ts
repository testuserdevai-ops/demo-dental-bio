import "server-only";

import { updateTag } from "next/cache";

import {
  publicProfileMutationTags,
  type PublicProfileMutation,
} from "./cache-tags";

export function invalidatePublicProfileCache(
  mutation: PublicProfileMutation,
): void {
  for (const tag of publicProfileMutationTags(mutation)) updateTag(tag);
}
