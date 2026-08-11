"use client";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import SocialLinks from "../components/SocialLinks";

export function DirectBookingSocialLinks({
  socials,
  website,
}: {
  socials: PublicProfileViewModel["socials"];
  website: string | null;
}) {
  return (
    <SocialLinks {...(socials ?? {})} website_link={website ?? undefined} />
  );
}
