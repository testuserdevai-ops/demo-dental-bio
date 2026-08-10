import "server-only";

import { updateTag } from "next/cache";

import {
  publicProfileMutationTags,
  publicProfileUsernameTag,
  type PublicProfileMutation,
} from "./cache-tags";

export function invalidatePublicProfileCache(
  mutation: PublicProfileMutation,
): void {
  for (const tag of publicProfileMutationTags(mutation)) updateTag(tag);
}

export function invalidatePublicProfileIdentityCache(
  usernames: readonly string[],
): void {
  const tags = new Set(usernames.map(publicProfileUsernameTag));
  for (const tag of tags) {
    updateTag(tag);
  }
}
