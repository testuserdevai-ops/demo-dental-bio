import { FacebookLogo, InstagramLogo, TiktokLogo, TwitterLogo } from '@phosphor-icons/react';
import React from 'react'

type SocialLinkProps = {
  twitter_link?: string;
  instagram_link?: string;
  facebook_link?: string;
  tiktok_link?: string;
  other_link?: string;
  website_link?: string;
}

const SocialLinks: React.FC<SocialLinkProps> = ({
  twitter_link,
  instagram_link,
  facebook_link,
  tiktok_link,
  other_link,
  website_link
}) => {
  return (
    <div className="flex items-center justify-center gap-2 pt-1">
      {instagram_link && (
        <a
          href={instagram_link}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
        >
          <InstagramLogo
            size={18}
            weight="bold"
            className="text-white font-black"
          />
        </a>
      )}
      {tiktok_link && (
        <a
          href={tiktok_link}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
        >
          <TiktokLogo
            size={18}
            weight="bold"
            className="text-white font-black"
          />
        </a>
      )}
      {twitter_link && (
        <a
          href={twitter_link}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
        >
          <TwitterLogo
            size={18}
            weight="bold"
            className="text-white font-black"
          />
        </a>
      )}
      {facebook_link && (
        <a
          href={facebook_link}
          className="no-underline bg-neutral-800 rounded-full p-[2px]"
          target="_blank"
        >
          <FacebookLogo
            size={22}
            weight="bold"
            className="text-white font-black"
          />
        </a>
      )}
      {other_link && (
        <a
          href={other_link.startsWith("http") ? other_link : `https://${other_link}`}
          className="no-underline bg-neutral-800 rounded-full p-1"
          target="_blank"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="#ffff"
            viewBox="0 0 256 256"
          >
            <path d="M128,24h0A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm88,104a87.61,87.61,0,0,1-3.33,24H174.16a157.44,157.44,0,0,0,0-48h38.51A87.61,87.61,0,0,1,216,128ZM102,168H154a115.11,115.11,0,0,1-26,45A115.27,115.27,0,0,1,102,168Zm-3.9-16a140.84,140.84,0,0,1,0-48h59.88a140.84,140.84,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.84a157.44,157.44,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154,88H102a115.11,115.11,0,0,1,26-45A115.27,115.27,0,0,1,154,88Zm52.33,0H170.71a135.28,135.28,0,0,0-22.3-45.6A88.29,88.29,0,0,1,206.37,88ZM107.59,42.4A135.28,135.28,0,0,0,85.29,88H49.63A88.29,88.29,0,0,1,107.59,42.4ZM49.63,168H85.29a135.28,135.28,0,0,0,22.3,45.6A88.29,88.29,0,0,1,49.63,168Zm98.78,45.6a135.28,135.28,0,0,0,22.3-45.6h35.66A88.29,88.29,0,0,1,148.41,213.6Z"></path>
          </svg>
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
            <line x1="80" y1="128" x2="176" y2="128" fill="none" stroke="#fff" stroke-width="28" />
            <path d="M104,176H64a48,48,0,0,1,0-96h40" fill="none" stroke="#fff" stroke-width="28" />
            <path d="M152,80h40a48,48,0,0,1,48,48h0a48,48,0,0,1-48,48H152" fill="none" stroke="#fff" stroke-width="28" />
          </svg>
        </a>
      )}
    </div>
  )
}

export default SocialLinks;