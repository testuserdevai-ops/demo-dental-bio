import "server-only";

import { revalidateTag } from "next/cache";

import { publicProfileUsernameTag } from "./cache-tags";

export function revalidatePublicProfileIdentityCache(
  usernames: readonly (string | null | undefined)[],
): void {
  const tags = new Set(
    usernames
      .filter((username): username is string => Boolean(username))
      .map(publicProfileUsernameTag),
  );

  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}
