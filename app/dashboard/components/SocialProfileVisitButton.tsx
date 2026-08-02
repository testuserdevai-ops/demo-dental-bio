"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import {
  parseSocialMediaProfile,
  socialProfileConfigs,
  type SocialPlatform,
} from "@/utils/functions/socialMediaProfiles";

type Props = {
  platform: SocialPlatform;
  value: string;
};

export default function SocialProfileVisitButton({ platform, value }: Props) {
  const config = socialProfileConfigs[platform];
  const parsedValue = parseSocialMediaProfile(value, platform);
  const visitUrl = parsedValue.valid && !parsedValue.blank ? parsedValue.url : null;

  return (
    <button
      type="button"
      disabled={!visitUrl}
      aria-label={`Visit ${config.label.replace(" (optional)", "")}`}
      title={visitUrl ? `Open ${visitUrl}` : "Enter a valid profile handle or URL first"}
      className="ml-2 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-primary-1 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400"
      onClick={() => {
        if (!visitUrl) return;
        const opened = window.open(visitUrl, "_blank", "noopener,noreferrer");
        if (opened) opened.opener = null;
      }}
    >
      <span className="hidden sm:inline">Visit</span>
      <ArrowSquareOut size={18} aria-hidden="true" />
    </button>
  );
}
