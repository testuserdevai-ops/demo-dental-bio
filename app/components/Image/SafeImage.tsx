import Image, { type ImageProps } from "next/image";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src: ImageProps["src"] | null | undefined;
};

export function safeMediaSrc(source: string | null | undefined) {
  return source?.trim() ? source : undefined;
}

export default function SafeImage({
  src,
  alt,
  unoptimized,
  ...props
}: SafeImageProps) {
  if (typeof src === "string" && !safeMediaSrc(src)) return null;
  if (!src) return null;

  const isLocalMedia =
    typeof src === "string" &&
    /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(src);

  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={unoptimized || isLocalMedia}
      {...props}
    />
  );
}
