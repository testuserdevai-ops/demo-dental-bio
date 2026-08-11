"use client";

import { useState, type MouseEventHandler } from "react";

import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { TrackableAction } from "@/lib/analytics/contract";
import type { PublicLinkPresentation } from "@/lib/public-profile/link-presentation";
import { cn } from "@/lib/utils";

import styles from "./PublicProfileLinkCard.module.css";

export type PublicProfileLinkCardProps = {
  href: string;
  label: string;
  presentation: PublicLinkPresentation;
  analytics: TrackableAction;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

/** Shared native-anchor renderer consumed by Basic and selectable templates. */
export function PublicProfileLinkCard({
  href,
  label,
  presentation,
  analytics,
  onClick,
}: PublicProfileLinkCardProps) {
  const [imageAvailable, setImageAvailable] = useState(
    presentation.variant !== "none",
  );
  const variant = imageAvailable ? presentation.variant : "none";
  const imageAlt = presentation.decorative ? "" : (presentation.imageAlt ?? "");

  return (
    <TrackedLink
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      analytics={analytics}
      onClick={onClick}
      className={cn(
        styles.link,
        variant === "small-icon" && styles.smallIcon,
        variant === "large-image" && styles.largeImage,
        variant === "none" && styles.textOnly,
        presentation.featured && styles.featured,
      )}
      data-link-image-variant={variant}
      data-link-featured={presentation.featured ? "true" : "false"}
    >
      {variant !== "none" && presentation.imageUrl ? (
        // URLs are owner-selected public Storage objects. Failure intentionally
        // collapses to the same navigable text-only anchor.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={presentation.imageUrl}
          alt={imageAlt}
          loading="lazy"
          decoding="async"
          className={
            variant === "small-icon"
              ? styles.smallImage
              : styles.largeImageAsset
          }
          onError={() => setImageAvailable(false)}
        />
      ) : null}
      <span className={styles.label}>{label}</span>
    </TrackedLink>
  );
}
