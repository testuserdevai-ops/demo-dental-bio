"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

type BlogImageProps = {
  src: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string; // optional styling for fallback box
};

const BlogImage = ({
  src,
  alt = "Image preview",
  className = "",
  fallbackClassName = "",
}: BlogImageProps) => {
  const [isValid, setIsValid] = useState(true);

  const handleError = useCallback(() => {
    setIsValid(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsValid(true);
  }, []);

  return (
    <div className={`relative aspect-square overflow-hidden ${className}`}>
      {src && isValid ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          unoptimized
          className="w-full h-full object-cover"
          onError={handleError}
          onLoad={handleLoad}
          draggable={false}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center bg-gray-100 rounded-sm ${fallbackClassName}`}
        >
          <svg
            className="w-10 h-10 text-gray-300"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 18"
          >
            <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default BlogImage;
