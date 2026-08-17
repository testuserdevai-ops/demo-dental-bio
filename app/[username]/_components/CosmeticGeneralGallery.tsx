"use client";

import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedButton } from "@/app/components/analytics/TrackedAction";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";

import type { CosmeticGeneralGallery as CosmeticGeneralGalleryItem } from "../_lib/cosmetic-transformation-template";

export default function CosmeticGeneralGallery({
  caseCount,
  images,
}: {
  caseCount: number;
  images: readonly CosmeticGeneralGalleryItem[];
}) {
  if (images.length === 0) return null;

  return (
    <section
      aria-labelledby="cosmetic-general-gallery-title"
      className="space-y-4"
      data-profile-module="cosmetic-general-gallery"
    >
      <h2
        className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        id="cosmetic-general-gallery-title"
      >
        General gallery
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {images.map((image, index) => {
          const position = caseCount + index + 1;

          return (
            <Dialog key={image.id}>
              <figure
                className="min-w-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-card shadow-sm"
                data-general-gallery-id={image.id}
              >
                <DialogTrigger asChild>
                  <TrackedButton
                    analytics={{
                      section: "gallery",
                      position,
                      action: {
                        type: "gallery_open",
                        galleryId: String(image.id),
                      },
                    }}
                    aria-label={`Open ${image.title}`}
                    className="group relative block aspect-square w-full overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <SafeImage
                      alt={image.title}
                      className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                      fill
                      sizes="(min-width: 640px) 190px, calc(50vw - 38px)"
                      src={image.image_url}
                    />
                  </TrackedButton>
                </DialogTrigger>
                <figcaption className="p-3 text-sm font-semibold leading-5 text-card-foreground">
                  {image.title}
                </figcaption>
              </figure>

              <DialogContent className="max-w-3xl border border-border bg-card p-4 sm:p-6">
                <DialogHeader className="pr-10">
                  <DialogTitle>{image.title}</DialogTitle>
                  <DialogDescription>Full-size gallery image</DialogDescription>
                </DialogHeader>
                <div className="relative min-h-[50vh] w-full overflow-hidden rounded-[var(--radius-md)] bg-muted sm:min-h-[65vh]">
                  <SafeImage
                    alt={image.title}
                    className="object-contain"
                    fill
                    sizes="(min-width: 768px) 720px, calc(100vw - 64px)"
                    src={image.image_url}
                  />
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
    </section>
  );
}
