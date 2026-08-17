"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useState } from "react";

import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedButton } from "@/app/components/analytics/TrackedAction";

type CosmeticCase = {
  id: number;
  before_image_url: string | null;
  after_image_url: string | null;
  title: string | null;
  before_image_label: string | null;
  after_image_label: string | null;
};

function ResultImage({
  src,
  label,
  title,
}: {
  src: string;
  label: string;
  title: string;
}) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-[var(--radius-md)] bg-muted">
      <div className="relative aspect-[4/5] sm:aspect-[4/3]">
        <SafeImage
          alt={`${label}: ${title}`}
          className="object-cover"
          fill
          sizes="(min-width: 640px) 360px, 44vw"
          src={src}
        />
      </div>
      <figcaption className="px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.16em] text-card-foreground">
        {label}
      </figcaption>
    </figure>
  );
}

export default function CosmeticCaseGallery({
  cases,
}: {
  cases: readonly CosmeticCase[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeCase = cases[activeIndex];

  if (!activeCase) return null;

  const title = activeCase.title?.trim() || `Smile result ${activeIndex + 1}`;
  const beforeLabel = activeCase.before_image_label?.trim() || "Before";
  const afterLabel = activeCase.after_image_label?.trim() || "After";
  const previousIndex = Math.max(0, activeIndex - 1);
  const nextIndex = Math.min(cases.length - 1, activeIndex + 1);

  return (
    <section
      aria-labelledby="cosmetic-results-title"
      className="space-y-4"
      id="gallery"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Real treatment examples
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            id="cosmetic-results-title"
          >
            Before &amp; after
          </h2>
          <span className="shrink-0 text-sm font-semibold text-muted-foreground">
            {activeIndex + 1} of {cases.length}
          </span>
        </div>
      </div>

      <article
        aria-label={`${title}, case ${activeIndex + 1} of ${cases.length}`}
        className="rounded-[var(--radius-lg)] border border-border bg-card p-3 shadow-[var(--elevation-card)] sm:p-5"
        data-gallery-id={activeCase.id}
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <ResultImage
            label={beforeLabel}
            src={activeCase.before_image_url || "/placeholder.webp"}
            title={title}
          />
          <ResultImage
            label={afterLabel}
            src={activeCase.after_image_url || "/placeholder.webp"}
            title={title}
          />
        </div>
        <h3 className="mt-4 text-center text-base font-bold text-card-foreground sm:text-lg">
          {title}
        </h3>
      </article>

      {cases.length > 1 ? (
        <div className="grid grid-cols-2 gap-3" aria-label="Browse results">
          <TrackedButton
            analytics={{
              section: "gallery",
              position: previousIndex + 1,
              action: {
                type: "gallery_open",
                galleryId: String(cases[previousIndex]?.id ?? activeCase.id),
              },
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-full)] border border-border bg-card px-4 py-3 text-sm font-bold text-card-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex(previousIndex)}
          >
            <CaretLeft aria-hidden="true" size={18} weight="bold" />
            Previous
          </TrackedButton>
          <TrackedButton
            analytics={{
              section: "gallery",
              position: nextIndex + 1,
              action: {
                type: "gallery_open",
                galleryId: String(cases[nextIndex]?.id ?? activeCase.id),
              },
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-4 py-3 text-sm font-bold text-[var(--profile-on-primary-action)] transition-colors hover:bg-[var(--profile-primary-action-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={activeIndex === cases.length - 1}
            onClick={() => setActiveIndex(nextIndex)}
          >
            Next result
            <CaretRight aria-hidden="true" size={18} weight="bold" />
          </TrackedButton>
        </div>
      ) : null}
    </section>
  );
}
