import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  TiktokLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";

import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { PublicSocialLinks } from "../_lib/public-profile";
import { getSafeSocialProfileUrl } from "@/utils/functions/socialMediaProfiles";

const platforms = [
  {
    key: "instagram_link",
    label: "Instagram",
    platform: "instagram",
    Icon: InstagramLogo,
  },
  {
    key: "tiktok_link",
    label: "TikTok",
    platform: "tiktok",
    Icon: TiktokLogo,
  },
  { key: "twitter_link", label: "X", platform: "x", Icon: XLogo },
  {
    key: "facebook_link",
    label: "Facebook",
    platform: "facebook",
    Icon: FacebookLogo,
  },
  {
    key: "linkedin_link",
    label: "LinkedIn",
    platform: "linkedin",
    Icon: LinkedinLogo,
  },
] as const;

export default function LocationRouterSocialLinks({
  socials,
}: {
  socials: PublicSocialLinks | null;
}) {
  if (!socials) return null;

  const links = platforms.flatMap((item) => {
    const provider = item.platform === "x" ? "twitter" : item.platform;
    const href = getSafeSocialProfileUrl(socials[item.key], provider);
    return href ? [{ ...item, href }] : [];
  });
  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Social profiles"
      className="flex flex-wrap justify-center gap-2"
    >
      {links.map(({ Icon, href, key, label, platform }, index) => (
        <TrackedLink
          analytics={{
            section: "profile",
            position: index + 1,
            action: { type: "social_click", platform },
          }}
          aria-label={`Open ${label} profile`}
          className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-card-foreground no-underline transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
          href={href}
          key={key}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Icon aria-hidden="true" size={20} weight="bold" />
        </TrackedLink>
      ))}
    </nav>
  );
}
