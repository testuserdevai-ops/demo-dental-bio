"use client";

import { useState } from "react";

import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedButton } from "@/app/components/analytics/TrackedAction";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

import type {
  CommerceGalleryCase,
  CommerceGeneralGalleryImage,
} from "../_lib/clinic-commerce-template";

type SelectedImage = {
  galleryId: string;
  position: number;
  src: string;
  title: string;
  label: string;
  alt: string;
  caption: string;
};

function GalleryImageButton({
  image,
  onOpen,
}: {
  image: SelectedImage;
  onOpen(image: SelectedImage): void;
}) {
  return (
    <TrackedButton
      analytics={{
        section: "gallery",
        position: image.position,
        action: { type: "gallery_open", galleryId: image.galleryId },
      }}
      aria-label={`Open ${image.label.toLowerCase()} image for ${image.title}`}
      className="group block w-full overflow-hidden rounded-[var(--radius-md)] bg-muted text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      onClick={() => onOpen(image)}
    >
      <span className="relative block aspect-[4/3] overflow-hidden">
        <SafeImage
          alt={image.alt}
          className="object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none"
          fill
          sizes="(min-width: 640px) 280px, 44vw"
          src={image.src}
        />
      </span>
      <span className="block px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-card-foreground">
        {image.caption}
      </span>
    </TrackedButton>
  );
}

function CaseCard({
  galleryCase,
  onOpen,
}: {
  galleryCase: CommerceGalleryCase;
  onOpen(image: SelectedImage): void;
}) {
  const shared = {
    galleryId: String(galleryCase.id),
    position: galleryCase.position,
    title: galleryCase.title,
  };

  return (
    <article
      aria-labelledby={`commerce-gallery-case-${galleryCase.id}`}
      className="rounded-[var(--radius-lg)] border border-border bg-card p-3 shadow-sm sm:p-4"
      data-gallery-id={galleryCase.id}
      data-gallery-kind="before-after"
      data-gallery-position={galleryCase.position}
    >
      <h4
        className="mb-3 text-base font-bold text-card-foreground"
        id={`commerce-gallery-case-${galleryCase.id}`}
      >
        {galleryCase.title}
      </h4>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <GalleryImageButton
          image={{
            ...shared,
            src: galleryCase.beforeImageUrl,
            label: galleryCase.beforeLabel,
            alt: `${galleryCase.beforeLabel}: ${galleryCase.title}`,
            caption: galleryCase.beforeLabel,
          }}
          onOpen={onOpen}
        />
        <GalleryImageButton
          image={{
            ...shared,
            src: galleryCase.afterImageUrl,
            label: galleryCase.afterLabel,
            alt: `${galleryCase.afterLabel}: ${galleryCase.title}`,
            caption: galleryCase.afterLabel,
          }}
          onOpen={onOpen}
        />
      </div>
    </article>
  );
}

function GeneralImageCard({
  image,
  onOpen,
}: {
  image: CommerceGeneralGalleryImage;
  onOpen(image: SelectedImage): void;
}) {
  const selected = {
    galleryId: String(image.id),
    position: image.position,
    src: image.imageUrl,
    title: image.title,
    label: "Gallery",
    alt: image.title,
    caption: image.title,
  };
  return (
    <article
      className="rounded-[var(--radius-lg)] border border-border bg-card p-3 shadow-sm"
      data-gallery-id={image.id}
      data-gallery-kind="general"
      data-gallery-position={image.position}
    >
      <GalleryImageButton image={selected} onOpen={onOpen} />
    </article>
  );
}

export default function ClinicCommerceGallerySection({
  cases,
  generalImages,
}: {
  cases: readonly CommerceGalleryCase[];
  generalImages: readonly CommerceGeneralGalleryImage[];
}) {
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  if (cases.length === 0 && generalImages.length === 0) return null;

  return (
    <section
      aria-labelledby="commerce-gallery-heading"
      className="space-y-6"
      data-profile-module="clinic-commerce-gallery"
      id="gallery"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Clinic and results
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          id="commerce-gallery-heading"
        >
          Gallery
        </h2>
      </div>

      {cases.length > 0 ? (
        <section
          aria-labelledby="commerce-results-heading"
          className="space-y-3"
        >
          <h3
            className="text-lg font-bold text-foreground"
            id="commerce-results-heading"
          >
            Before and after
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {cases.map((galleryCase) => (
              <CaseCard
                galleryCase={galleryCase}
                key={galleryCase.id}
                onOpen={setSelected}
              />
            ))}
          </div>
        </section>
      ) : null}

      {generalImages.length > 0 ? (
        <section
          aria-labelledby="commerce-general-gallery-heading"
          className="space-y-3"
        >
          <h3
            className="text-lg font-bold text-foreground"
            id="commerce-general-gallery-heading"
          >
            General gallery
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {generalImages.map((image) => (
              <GeneralImageCard
                image={image}
                key={image.id}
                onOpen={setSelected}
              />
            ))}
          </div>
        </section>
      ) : null}

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>{selected?.label}</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="relative min-h-[55vh] overflow-hidden rounded-[var(--radius-md)] bg-muted">
              <SafeImage
                alt={selected.alt}
                className="object-contain"
                fill
                sizes="(min-width: 768px) 720px, calc(100vw - 48px)"
                src={selected.src}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
