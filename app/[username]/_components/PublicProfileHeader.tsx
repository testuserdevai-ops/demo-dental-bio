"use client";

import { CalendarCheck, EnvelopeSimple, Phone } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import SafeImage from "@/app/components/Image/SafeImage";
import VerificationBadge from "@/app/components/VerificationBadge";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { TrackableAction } from "@/lib/analytics/contract";
import type { ProfileTemplateId } from "@/lib/profile-presentation/catalog";

import ShareModal from "../components/ShareModal";

type HeaderAction = {
  href: string;
  label: string;
  external: boolean;
  Icon: typeof CalendarCheck;
  analytics: TrackableAction | readonly TrackableAction[];
};

type PublicProfileHeaderProps = {
  profileId: string;
  username: string;
  displayName: string;
  imageUrl: string;
  isVerified: boolean;
  templateId: ProfileTemplateId;
  bookingEnabled: boolean;
  bookingLink: string | null;
  email: string | null;
  phone: string | null;
};

function resolveHeaderAction({
  bookingEnabled,
  bookingLink,
  email,
  phone,
}: Pick<
  PublicProfileHeaderProps,
  "bookingEnabled" | "bookingLink" | "email" | "phone"
>): HeaderAction | null {
  if (bookingEnabled && bookingLink?.trim()) {
    return {
      href: bookingLink.trim(),
      label: "Book",
      external: /^https?:\/\//i.test(bookingLink.trim()),
      Icon: CalendarCheck,
      analytics: [
        { action: { type: "booking_click" }, section: "header" },
        {
          action: { type: "cta_click", ctaType: "booking" },
          section: "header",
        },
      ],
    };
  }

  if (email?.trim()) {
    return {
      href: `mailto:${email.trim()}`,
      label: "Contact",
      external: false,
      Icon: EnvelopeSimple,
      analytics: [
        { action: { type: "email_click" }, section: "header" },
        {
          action: { type: "cta_click", ctaType: "email" },
          section: "header",
        },
      ],
    };
  }

  if (phone?.trim()) {
    return {
      href: `tel:${phone.trim()}`,
      label: "Call",
      external: false,
      Icon: Phone,
      analytics: [
        { action: { type: "phone_click" }, section: "header" },
        {
          action: { type: "cta_click", ctaType: "phone" },
          section: "header",
        },
      ],
    };
  }

  return null;
}

/** Shared identity/action concept that remains visually adaptable per template. */
export default function PublicProfileHeader({
  profileId,
  username,
  displayName,
  imageUrl,
  isVerified,
  templateId,
  bookingEnabled,
  bookingLink,
  email,
  phone,
}: PublicProfileHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const action = resolveHeaderAction({
    bookingEnabled,
    bookingLink,
    email,
    phone,
  });

  useEffect(() => {
    const updateScrolledState = () => setScrolled(window.scrollY > 48);
    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 mx-auto h-20 w-full max-w-[661px] bg-[color-mix(in_srgb,var(--profile-page-background)_92%,transparent)] px-3 pt-3 backdrop-blur-md sm:px-6 sm:pt-4"
      data-profile-header="true"
      data-profile-header-scrolled={scrolled ? "true" : "false"}
      data-profile-header-template={templateId}
    >
      <div
        className={`flex min-h-16 items-center rounded-[var(--radius-full)] px-3 py-2 transition-[background-color,border-color,box-shadow,gap] duration-200 motion-reduce:transition-none sm:px-4 ${
          scrolled
            ? "gap-3 border border-[var(--profile-border-subtle)] bg-[var(--profile-surface)] shadow-[var(--elevation-card)]"
            : "gap-0 border border-transparent bg-transparent shadow-none"
        }`}
      >
        <div
          className={`shrink-0 overflow-hidden rounded-full bg-[var(--profile-muted)] transition-[width,opacity,margin] duration-200 motion-reduce:transition-none ${
            scrolled ? "mr-0 size-11 opacity-100" : "mr-0 size-0 opacity-0"
          }`}
        >
          <SafeImage
            alt={
              displayName ? `Portrait of ${displayName}` : "Profile portrait"
            }
            className="size-11 object-cover"
            height={44}
            src={imageUrl || "/placeholder.webp"}
            width={44}
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-sm font-bold text-[var(--profile-text)] sm:text-base">
            @{username}
          </span>
          {isVerified ? (
            <VerificationBadge direction="right" size={18} />
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {action ? (
            <TrackedLink
              analytics={action.analytics}
              aria-label={action.label}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-4 py-2 text-sm font-bold text-[var(--profile-on-primary-action)] no-underline transition-colors hover:bg-[var(--profile-primary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-focus)] active:bg-[var(--profile-primary-action-active)] sm:px-5"
              href={action.href}
              rel={action.external ? "noopener noreferrer" : undefined}
              target={action.external ? "_blank" : undefined}
            >
              <action.Icon aria-hidden="true" className="sm:hidden" size={18} />
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sr-only sm:hidden">{action.label}</span>
            </TrackedLink>
          ) : null}
          <ShareModal
            profileId={profileId}
            triggerClassName="inline-flex size-11 items-center justify-center rounded-full border border-[var(--profile-border-subtle)] bg-[var(--profile-secondary-action)] text-[var(--profile-on-secondary-action)] transition-colors hover:bg-[var(--profile-secondary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-focus)] active:bg-[var(--profile-secondary-action-active)]"
            username={username}
          />
        </div>
      </div>
    </header>
  );
}
