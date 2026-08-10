"use client";

import BlogImage from "@/app/components/Image/BlogImage";

function GalleryImage({
  src,
  alt,
  label,
}: {
  src: string;
  alt: string;
  label?: string;
}) {
  return (
    <div className="min-w-0">
      <BlogImage
        src={src}
        alt={alt}
        className="aspect-[4/3] max-h-72 w-full rounded-xl bg-muted"
      />
      {label && (
        <p className="mt-2 truncate px-1 text-center text-sm font-medium text-muted-foreground sm:text-base">
          {label}
        </p>
      )}
    </div>
  );
}

export { GalleryImage };
