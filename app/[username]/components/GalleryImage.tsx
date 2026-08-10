"use client";
import BlogImage from "@/app/components/Image/BlogImage";
import { useState } from "react";
import { TrackedButton } from "@/app/components/analytics/TrackedAction";

type GalleryImageProps = {
  galleryId: string;
  position: number;
  src: string;
  title: string;
  subTitle: string;
  className?: string;
};

const GalleryImage: React.FC<GalleryImageProps> = ({
  src,
  galleryId,
  position,
  title,
  subTitle,
  className,
}: GalleryImageProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <div className={`w-[40%] ${className}`}>
        <TrackedButton
          analytics={{
            action: { type: "gallery_open", galleryId },
            section: "gallery",
            position,
          }}
          className="w-full rounded-lg cursor-pointer overflow-hidden mb-3 border-0 bg-transparent p-0"
          onClick={() => setIsOpen(true)}
          aria-label={`Open ${title || "gallery image"}`}
        >
          <BlogImage
            src={src}
            className="w-full h-auto object-cover hover:scale-110 transition-all duration-300 aspect-[14/16]"
          />
        </TrackedButton>
        <h5 className="text-[18px] font-medium mb-1">{title}</h5>
        <h6 className="text-gray-input text-[16px]">{subTitle}</h6>
      </div>

      {isOpen && (
        <div
          className={`fixed top-0 left-0 bottom-0 right-0 flex justify-center items-center z-10 bg-overlay-dark ${isOpen ? "animate-fade-in-short" : "animate-fade-out-short"}`}
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="w-[90vw] h-[90vh] max-w-5xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <BlogImage
              src={src}
              alt={title || "Gallery image"}
              layout="fill"
              objectFit="contain"
              className="rounded-lg shadow-lg"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default GalleryImage;
