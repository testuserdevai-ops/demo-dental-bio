'use client'
import BlogImage from "@/app/components/Image/BlogImage";
import { useState } from "react";

type GalleryImageProps = {
  src: string;
  title: string;
  subTitle: string;
  className?: string;
}

const GalleryImage: React.FC<GalleryImageProps> = ({
  src,
  title,
  subTitle,
  className,
}: GalleryImageProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <div
        className={`w-[40%] ${className}`}
      >
        <div className="w-full rounded-lg cursor-pointer overflow-hidden mb-3 " onClick={() => setIsOpen(true)}>
          <BlogImage
            src={src}
            className="W-full h-auto object-cover hover:scale-110 transition-all duration-300 aspect-[14/16]"
          />
        </div>
        <h5 className="text-[18px] font-medium mb-1">{title}</h5>
        <h6 className="text-[#989898] text-[16px]">{subTitle}</h6>
      </div>

      {isOpen &&
        <div
          className={`fixed top-0 left-0 bottom-0 right-0 flex justify-center items-center z-10 bg-[#00000090] ${isOpen ? "animate-fade-in-short" : "animate-fade-out-short"}`}
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
          >
            <BlogImage
              src={src}
              className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>}
    </>
  )
}

export default GalleryImage;