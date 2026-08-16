import SafeImage from "@/app/components/Image/SafeImage";
import { cn } from "@/lib/utils";
import type { PublicLocationDetails } from "../_lib/location-map";

export function getLocationImagePresentation(
  location: PublicLocationDetails,
): { src: string; alt: string } | null {
  const source = location.image_url?.trim();
  if (!source) return null;

  try {
    const url = new URL(source);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    )
      return null;
  } catch {
    return null;
  }

  if (location.image_decorative) return { src: source, alt: "" };
  const alt = location.image_alt?.trim();
  return alt ? { src: source, alt } : null;
}

export default function LocationImage({
  location,
  className,
  sizes = "(min-width: 640px) 320px, calc(100vw - 64px)",
}: {
  location: PublicLocationDetails;
  className?: string;
  sizes?: string;
}) {
  const image = getLocationImagePresentation(location);
  if (!image) return null;

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-[var(--radius-md)] bg-muted",
        className,
      )}
      data-location-image
    >
      <SafeImage
        alt={image.alt}
        className="object-cover"
        fill
        sizes={sizes}
        src={image.src}
      />
    </div>
  );
}
