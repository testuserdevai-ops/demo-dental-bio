import Link from "next/link";
import React from "react";

type LinkTitleProps = {
  link: string;
  title: string;
  onLinkClick?: (linkId: string, linkUrl: string) => void;
  linkId?: string;
  isExternal?: boolean;
};

const LinkTitle: React.FC<LinkTitleProps> = ({
  link,
  title,
  onLinkClick,
  linkId,
  isExternal = false,
}: LinkTitleProps) => {
  const handleClick = async (e: React.MouseEvent) => {
    if (onLinkClick && linkId) {
      e.preventDefault();
      onLinkClick(linkId, link);
    }
  };

  if (onLinkClick && linkId) {
    return (
      <div className="w-full">
        <div className="toplinks-main">
          <button
            onClick={handleClick}
            className="text-center toplinks-wrapper toplinks-without-image w-full bg-transparent border-none cursor-pointer"
          >
            <span>{title || "Untitled Link"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="toplinks-main">
        <Link
          href={link || "#"}
          className="text-center"
          rel="noopener noreferrer"
          target={isExternal ? "_blank" : "_self"}
        >
          <span>{title || "Untitled Link"}</span>
        </Link>
      </div>
    </div>
  );
};

export default LinkTitle;
