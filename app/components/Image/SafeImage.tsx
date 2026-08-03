import Image, { type ImageProps } from "next/image";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src: ImageProps["src"] | null | undefined;
};

export function safeMediaSrc(source: string | null | undefined) {
  return source?.trim() ? source : undefined;
}

export default function SafeImage({ src, alt, ...props }: SafeImageProps) {
  if (typeof src === "string" && !safeMediaSrc(src)) return null;
  if (!src) return null;

  return <Image src={src} alt={alt} {...props} />;
}
