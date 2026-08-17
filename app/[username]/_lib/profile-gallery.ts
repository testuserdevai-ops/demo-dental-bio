export type ProfileGalleryCase = {
  id: number;
  title: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeLabel: string | null;
  afterLabel: string | null;
  position: number;
};

export type ProfileGeneralGalleryImage = {
  id: number;
  title: string;
  imageUrl: string;
  position: number;
};

type GalleryCandidate = {
  id?: unknown;
  title?: unknown;
  before_image_url?: unknown;
  after_image_url?: unknown;
  before_image_label?: unknown;
  after_image_label?: unknown;
  enabled?: unknown;
};

type GeneralGalleryCandidate = {
  id?: unknown;
  title?: unknown;
  image_url?: unknown;
  enabled?: unknown;
};

const PUBLIC_IMAGE_PATH_PATTERN = /^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result || null;
}

function normalizePublicImageUrl(value: unknown): string | null {
  const input = cleanText(value);
  if (!input) return null;

  if (input.startsWith("/")) {
    return PUBLIC_IMAGE_PATH_PATTERN.test(input) && !input.includes("..")
      ? input
      : null;
  }

  try {
    const url = new URL(input);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function isEnabled(value: GalleryCandidate | GeneralGalleryCandidate) {
  return !("enabled" in value) || value.enabled === true;
}

export function selectProfileGallery(
  galleries: readonly unknown[] | null | undefined,
  generalGalleries: readonly unknown[] | null | undefined,
): {
  cases: ProfileGalleryCase[];
  generalImages: ProfileGeneralGalleryImage[];
} {
  const seenCases = new Set<number>();
  const seenGeneralImages = new Set<number>();
  let position = 0;

  const cases = (Array.isArray(galleries) ? galleries : []).flatMap(
    (candidate): ProfileGalleryCase[] => {
      if (!candidate || typeof candidate !== "object") return [];
      const gallery = candidate as GalleryCandidate;
      const id = Number(gallery.id);
      const title = cleanText(gallery.title);
      const beforeImageUrl = normalizePublicImageUrl(gallery.before_image_url);
      const afterImageUrl = normalizePublicImageUrl(gallery.after_image_url);
      if (
        !Number.isSafeInteger(gallery.id) ||
        id <= 0 ||
        seenCases.has(id) ||
        !isEnabled(gallery) ||
        !title ||
        !beforeImageUrl ||
        !afterImageUrl
      ) {
        return [];
      }

      seenCases.add(id);
      position += 1;
      return [
        {
          id,
          title,
          beforeImageUrl,
          afterImageUrl,
          beforeLabel: cleanText(gallery.before_image_label),
          afterLabel: cleanText(gallery.after_image_label),
          position,
        },
      ];
    },
  );

  const generalImages = (
    Array.isArray(generalGalleries) ? generalGalleries : []
  ).flatMap((candidate): ProfileGeneralGalleryImage[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const gallery = candidate as GeneralGalleryCandidate;
    const id = Number(gallery.id);
    const title = cleanText(gallery.title);
    const imageUrl = normalizePublicImageUrl(gallery.image_url);
    if (
      !Number.isSafeInteger(gallery.id) ||
      id <= 0 ||
      seenGeneralImages.has(id) ||
      !isEnabled(gallery) ||
      !title ||
      !imageUrl
    ) {
      return [];
    }

    seenGeneralImages.add(id);
    position += 1;
    return [{ id, title, imageUrl, position }];
  });

  return { cases, generalImages };
}
