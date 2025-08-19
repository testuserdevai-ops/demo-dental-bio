"use client";

import { useState } from "react";
import Image from "next/image";

interface AvatarProps {
  avatarUrl?: string;
  size?: number;
  alt?: string;
}

export default function Avatar({
  avatarUrl,
  size = 48,
  alt = "User Avatar",
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  if (!avatarUrl || hasError) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#E5E7EB",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 128 128"
          fill="none"
          width={size}
          height={size}
        >
          <circle cx="64" cy="64" r="64" fill="#E5E7EB" />
          <circle cx="64" cy="48" r="20" fill="#9CA3AF" />
          <path
            fill="#9CA3AF"
            d="M16 112c0-22.091 17.909-40 40-40h16c22.091 0 40 17.909 40 40v0H16z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        overflow: "hidden",
        borderRadius: "50%",
        flexShrink: 0,
      }}
    >
      <Image
        src={avatarUrl}
        alt={alt}
        fill
        sizes={`${size}px`}
        onError={() => setHasError(true)}
        style={{ objectFit: "cover" }}
      />
    </div>
  );
}