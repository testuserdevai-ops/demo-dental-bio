import {
  FacebookLogoIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  TiktokLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import React from "react";
import { getSafeSocialProfileUrl } from "@/utils/functions/socialMediaProfiles";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { PublicSection } from "@/lib/analytics/contract";

type SocialLinkProps = {
  twitter_link?: string;
  instagram_link?: string;
  facebook_link?: string;
  tiktok_link?: string;
  linkedin_link?: string;
  website_link?: string;
  analyticsSection?: Extract<PublicSection, "profile" | "footer">;
};

const SocialLinks: React.FC<SocialLinkProps> = ({
  twitter_link,
  instagram_link,
  facebook_link,
  tiktok_link,
  linkedin_link,
  website_link,
  analyticsSection = "profile",
}) => {
  const instagramUrl = getSafeSocialProfileUrl(instagram_link, "instagram");
  const tiktokUrl = getSafeSocialProfileUrl(tiktok_link, "tiktok");
  const twitterUrl = getSafeSocialProfileUrl(twitter_link, "twitter");
  const facebookUrl = getSafeSocialProfileUrl(facebook_link, "facebook");
  const linkedinUrl = getSafeSocialProfileUrl(linkedin_link, "linkedin");
  const socialPosition = {
    instagram: 1,
    tiktok: Number(Boolean(instagramUrl)) + 1,
    twitter: Number(Boolean(instagramUrl)) + Number(Boolean(tiktokUrl)) + 1,
    facebook:
      Number(Boolean(instagramUrl)) +
      Number(Boolean(tiktokUrl)) +
      Number(Boolean(twitterUrl)) +
      1,
    website:
      Number(Boolean(instagramUrl)) +
      Number(Boolean(tiktokUrl)) +
      Number(Boolean(twitterUrl)) +
      Number(Boolean(facebookUrl)) +
      Number(Boolean(linkedinUrl)) +
      1,
    linkedin:
      Number(Boolean(instagramUrl)) +
      Number(Boolean(tiktokUrl)) +
      Number(Boolean(twitterUrl)) +
      Number(Boolean(facebookUrl)) +
      1,
  };

  return (
    <div className="flex items-center justify-center gap-2 pt-1">
      {instagramUrl && (
        <TrackedLink
          href={instagramUrl}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Instagram profile"
          analytics={{
            section: analyticsSection,
            position: socialPosition.instagram,
            action: { type: "social_click", platform: "instagram" },
          }}
        >
          <InstagramLogoIcon
            aria-hidden="true"
            size={18}
            weight="bold"
            className="text-white font-black"
          />
        </TrackedLink>
      )}
      {tiktokUrl && (
        <TrackedLink
          href={tiktokUrl}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open TikTok profile"
          analytics={{
            section: analyticsSection,
            position: socialPosition.tiktok,
            action: { type: "social_click", platform: "tiktok" },
          }}
        >
          <TiktokLogoIcon
            aria-hidden="true"
            size={18}
            weight="bold"
            className="text-white font-black"
          />
        </TrackedLink>
      )}
      {twitterUrl && (
        <TrackedLink
          href={twitterUrl}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open X profile"
          analytics={{
            section: analyticsSection,
            position: socialPosition.twitter,
            action: { type: "social_click", platform: "x" },
          }}
        >
          <XLogoIcon
            aria-hidden="true"
            size={18}
            weight="bold"
            className="text-white font-black"
          />
        </TrackedLink>
      )}
      {facebookUrl && (
        <TrackedLink
          href={facebookUrl}
          className="no-underline bg-neutral-800 rounded-full p-[2px]"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Facebook profile or page"
          analytics={{
            section: analyticsSection,
            position: socialPosition.facebook,
            action: { type: "social_click", platform: "facebook" },
          }}
        >
          <FacebookLogoIcon
            aria-hidden="true"
            size={22}
            weight="bold"
            className="text-white font-black"
          />
        </TrackedLink>
      )}
      {linkedinUrl && (
        <TrackedLink
          href={linkedinUrl}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open LinkedIn profile"
          analytics={{
            section: analyticsSection,
            position: socialPosition.linkedin,
            action: { type: "social_click", platform: "linkedin" },
          }}
        >
          <LinkedinLogoIcon
            aria-hidden="true"
            size={18}
            weight="bold"
            className="text-white font-black"
          />
        </TrackedLink>
      )}
      {website_link && (
        <TrackedLink
          href={
            website_link.startsWith("http")
              ? website_link
              : `https://${website_link}`
          }
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open website"
          analytics={{
            section: analyticsSection,
            position: socialPosition.website,
            action: { type: "social_click", platform: "website" },
          }}
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="#ffff"
            viewBox="0 0 256 256"
          >
            <line
              x1="80"
              y1="128"
              x2="176"
              y2="128"
              fill="none"
              stroke="#fff"
              strokeWidth="28"
            />
            <path
              d="M104,176H64a48,48,0,0,1,0-96h40"
              fill="none"
              stroke="#fff"
              strokeWidth="28"
            />
            <path
              d="M152,80h40a48,48,0,0,1,48,48h0a48,48,0,0,1-48,48H152"
              fill="none"
              stroke="#fff"
              strokeWidth="28"
            />
          </svg>
        </TrackedLink>
      )}
    </div>
  );
};

export default SocialLinks;
