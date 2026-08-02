import { FacebookLogoIcon, InstagramLogoIcon, TiktokLogoIcon, XLogoIcon } from '@phosphor-icons/react';
import React from 'react'
import { getSafeSocialProfileUrl } from '@/utils/functions/socialMediaProfiles';

type SocialLinkProps = {
  twitter_link?: string;
  instagram_link?: string;
  facebook_link?: string;
  tiktok_link?: string;
  website_link?: string;
}

const SocialLinks: React.FC<SocialLinkProps> = ({
  twitter_link,
  instagram_link,
  facebook_link,
  tiktok_link,
  website_link
}) => {
  const instagramUrl = getSafeSocialProfileUrl(instagram_link, "instagram");
  const tiktokUrl = getSafeSocialProfileUrl(tiktok_link, "tiktok");
  const twitterUrl = getSafeSocialProfileUrl(twitter_link, "twitter");
  const facebookUrl = getSafeSocialProfileUrl(facebook_link, "facebook");

  return (
    <div className="flex items-center justify-center gap-2 pt-1">
      {instagramUrl && (
        <a
          href={instagramUrl}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Instagram profile"
        >
          <InstagramLogoIcon
            size={18}
            weight="bold"
            className="text-white font-black"
          />
        </a>
      )}
      {tiktokUrl && (
        <a
          href={tiktokUrl}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open TikTok profile"
        >
          <TiktokLogoIcon
            size={18}
            weight="bold"
            className="text-white font-black"
          />
        </a>
      )}
      {twitterUrl && (
        <a
          href={twitterUrl}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open X profile"
        >
          <XLogoIcon
            size={18}
            weight="bold"
            className="text-white font-black"
          />
        </a>
      )}
      {facebookUrl && (
        <a
          href={facebookUrl}
          className="no-underline bg-neutral-800 rounded-full p-[2px]"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Facebook profile or page"
        >
          <FacebookLogoIcon
            size={22}
            weight="bold"
            className="text-white font-black"
          />
        </a>
      )}
      {website_link && (
        <a
          href={website_link.startsWith("http") ? website_link : `https://${website_link}`}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="#ffff"
            viewBox="0 0 256 256">
            <line x1="80" y1="128" x2="176" y2="128" fill="none" stroke="#fff" strokeWidth="28" />
            <path d="M104,176H64a48,48,0,0,1,0-96h40" fill="none" stroke="#fff" strokeWidth="28" />
            <path d="M152,80h40a48,48,0,0,1,48,48h0a48,48,0,0,1-48,48H152" fill="none" stroke="#fff" strokeWidth="28" />
          </svg>
        </a>
      )}
    </div>
  )
}

export default SocialLinks;
