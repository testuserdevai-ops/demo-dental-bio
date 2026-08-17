"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CaretRight,
  Copy,
  DotsThree,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

import {
  TrackedButton,
  TrackedLink,
} from "@/app/components/analytics/TrackedAction";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { useTrackedAction } from "@/app/contexts/AnalyticsContext";
import { useProfileTheme } from "@/app/components/profile-presentation/ProfileThemeRoot";
import { profileThemeToCSSProperties } from "@/lib/profile-presentation/themes";
import { cn } from "@/lib/utils";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

import { ReportProfileDialog } from "./ReportProfileDialog";
import { buildPublicProfileUrl, buildShareUrls } from "./share";

interface ShareModalProps {
  profileId: string;
  username: string;
  triggerClassName?: string;
}

function ShareActionRow({
  children,
  trailing = true,
}: {
  children: ReactNode;
  trailing?: boolean;
}) {
  return (
    <span className="flex min-h-16 w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[var(--profile-muted)] px-4 py-3 text-left text-sm font-semibold text-[var(--profile-text)] transition-colors hover:bg-[var(--profile-secondary-action)] hover:text-[var(--profile-on-secondary-action)] sm:px-5 sm:text-base">
      <span className="flex min-w-0 items-center gap-3">{children}</span>
      {trailing ? (
        <CaretRight aria-hidden="true" className="shrink-0" size={20} />
      ) : null}
    </span>
  );
}

function SocialLogo({ name, src }: { name: string; src: string }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className="size-8 shrink-0 object-contain"
      data-social-logo={name}
      height={32}
      src={src}
      width={32}
    />
  );
}

const ShareModal: React.FC<ShareModalProps> = ({
  profileId,
  username,
  triggerClassName,
}) => {
  const domainConfig = useDomainConfig();
  const theme = useProfileTheme();
  const profileUrl = buildPublicProfileUrl(
    domainConfig.baseUrl || `https://${domainConfig.domain || "dental.bio"}`,
    username,
  );
  const shareUrls = buildShareUrls(
    profileUrl,
    domainConfig.brandName,
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
  );
  const track = useTrackedAction();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(profileUrl).then(
      () => {
        track({
          action: { type: "share_click", channel: "copy" },
          section: "share",
        });
        setIsCopied(true);
        window.setTimeout(() => setIsCopied(false), 2000);
      },
      (error) => console.error("Could not copy profile link", error),
    );
  };

  const rowLinkClassName =
    "block rounded-[var(--radius-md)] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-focus)]";

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <TrackedButton
            analytics={{ action: { type: "share_open" }, section: "share" }}
            aria-label="Share profile"
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-current",
              triggerClassName,
            )}
          >
            <DotsThree
              aria-hidden="true"
              className="header-modal-icon text-current"
              data-share-trigger-icon="dots"
              size={28}
              weight="bold"
            />
          </TrackedButton>
        </DialogTrigger>

        <DialogContent
          className="bottom-0 top-auto flex h-[calc(100dvh-0.5rem)] max-h-[calc(100dvh-0.5rem)] w-full max-w-none -translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none rounded-t-[28px] border border-[var(--profile-border-subtle)] bg-[var(--profile-surface)] p-0 text-[var(--profile-text)] shadow-2xl sm:bottom-auto sm:top-1/2 sm:h-[min(760px,calc(100dvh-2rem))] sm:max-h-[min(760px,calc(100dvh-2rem))] sm:w-[calc(100%-2rem)] sm:max-w-[620px] sm:-translate-y-1/2 sm:rounded-[32px]"
          data-profile-share-dialog="true"
          data-profile-theme={theme.id}
          style={profileThemeToCSSProperties(theme)}
        >
          <DialogHeader className="border-b border-[var(--profile-border-subtle)] px-5 pb-4 pt-5 pr-16 text-left sm:px-6 sm:pb-5 sm:pt-6">
            <DialogTitle className="text-xl font-bold text-[var(--profile-text)]">
              Share @{username}
            </DialogTitle>
            <DialogDescription className="leading-5 text-[var(--profile-text)]">
              Choose how you want to share this public profile.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5">
            <button
              aria-label={`Copy ${domainConfig.brandName.toLowerCase()}`}
              className={cn(
                "w-full border-0 bg-transparent p-0",
                rowLinkClassName,
              )}
              onClick={copyLinkToClipboard}
              type="button"
            >
              <ShareActionRow>
                <Copy aria-hidden="true" className="shrink-0" size={30} />
                <span>{isCopied ? "Copied!" : "Copy profile link"}</span>
              </ShareActionRow>
            </button>

            <TrackedLink
              analytics={{
                action: { type: "share_click", channel: "linkedin" },
                section: "share",
              }}
              className={rowLinkClassName}
              href={shareUrls.linkedIn}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ShareActionRow>
                <SocialLogo name="linkedin" src="/brand/social/linkedin.png" />
                <span>Share on LinkedIn</span>
              </ShareActionRow>
            </TrackedLink>

            <TrackedLink
              analytics={{
                action: { type: "share_click", channel: "facebook" },
                section: "share",
              }}
              className={rowLinkClassName}
              href={shareUrls.facebook}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ShareActionRow>
                <SocialLogo name="facebook" src="/brand/social/facebook.png" />
                <span>Share on Facebook</span>
              </ShareActionRow>
            </TrackedLink>

            <TrackedLink
              analytics={{
                action: { type: "share_click", channel: "whatsapp" },
                section: "share",
              }}
              className={rowLinkClassName}
              href={shareUrls.whatsapp}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ShareActionRow>
                <SocialLogo name="whatsapp" src="/brand/social/whatsapp.svg" />
                <span>Share via WhatsApp</span>
              </ShareActionRow>
            </TrackedLink>

            <TrackedLink
              analytics={{
                action: { type: "share_click", channel: "messenger" },
                section: "share",
              }}
              className={rowLinkClassName}
              href={shareUrls.messenger}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ShareActionRow>
                <SocialLogo
                  name="messenger"
                  src="/brand/social/messenger.png"
                />
                <span>Share via Messenger</span>
              </ShareActionRow>
            </TrackedLink>

            <TrackedLink
              analytics={{
                action: { type: "share_click", channel: "email" },
                section: "share",
              }}
              className={rowLinkClassName}
              href={shareUrls.email}
            >
              <ShareActionRow>
                <EnvelopeSimple
                  aria-hidden="true"
                  className="shrink-0"
                  size={30}
                />
                <span>Share via Email</span>
              </ShareActionRow>
            </TrackedLink>

            <div className="mx-2 !my-5 border-t border-[var(--profile-border-subtle)]" />
            <button
              className={cn(
                "w-full border-0 bg-transparent p-0",
                rowLinkClassName,
              )}
              onClick={() => {
                setIsModalOpen(false);
                setIsReportOpen(true);
              }}
              type="button"
            >
              <ShareActionRow>
                <span>Report this {domainConfig.brandName}</span>
              </ShareActionRow>
            </button>
          </div>

          <div
            className="border-t border-[var(--profile-border-subtle)] bg-[var(--profile-muted)] px-5 py-4 text-center sm:px-6"
            data-analytics-exclusion="platform-acquisition"
          >
            <p className="mb-3 text-sm font-semibold text-[var(--profile-on-muted)]">
              Create your own {domainConfig.brandName}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-4 py-2 text-sm font-bold text-[var(--profile-on-primary-action)] no-underline transition-colors hover:bg-[var(--profile-primary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-focus)]"
                href="/register"
              >
                Sign up
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-full)] border border-[var(--profile-border)] bg-[var(--profile-surface)] px-4 py-2 text-sm font-bold text-[var(--profile-text)] no-underline transition-colors hover:bg-[var(--profile-secondary-action)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-focus)]"
                href="/"
              >
                Learn more
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ReportProfileDialog
        brandName={domainConfig.brandName}
        onOpenChange={setIsReportOpen}
        open={isReportOpen}
        profileId={profileId}
        username={username}
      />
    </>
  );
};

export default ShareModal;
