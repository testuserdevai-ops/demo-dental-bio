type UnknownRecord = Record<string, unknown>;

export type ProfileReview = {
  id: number;
  reviewerName: string;
  content: string;
  stars: number;
  imageUrl: string | null;
  platform: string;
  createdAt: string;
  position: number;
};

export type ProfileExternalReviewPage = {
  id: number;
  href: string;
  label: string;
  position: number;
};

export type ProfileReviewsSelection = {
  reviews: ProfileReview[];
  externalReviewPages: ProfileExternalReviewPage[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function nonBlankString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeCreatedAt(value: unknown): string | null {
  const input = nonBlankString(value);
  if (!input) return null;
  const timestamp = Date.parse(input);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizeReviewImage(value: unknown): string | null {
  const input = nonBlankString(value);
  if (!input || /[\\\u0000-\u001f]/.test(input)) return null;
  if (input.startsWith("/")) {
    return input.startsWith("//") || input.split("/").includes("..")
      ? null
      : input;
  }

  try {
    const url = new URL(input);
    const loopback = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);
    if (
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && loopback.has(url.hostname)))
    ) {
      return null;
    }
    return input;
  } catch {
    return null;
  }
}

function normalizeReview(
  value: unknown,
): Omit<ProfileReview, "position"> | null {
  if (!isRecord(value) || value.enabled !== true) return null;

  const id = positiveInteger(value.id);
  const reviewerName = nonBlankString(value.reviewer_name);
  const content = nonBlankString(value.content);
  const platform = nonBlankString(value.platform);
  const createdAt = normalizeCreatedAt(value.created_at);
  const stars = positiveInteger(value.stars);
  if (
    !id ||
    !reviewerName ||
    !content ||
    !platform ||
    !createdAt ||
    !stars ||
    stars > 5
  ) {
    return null;
  }

  return {
    id,
    reviewerName,
    content,
    stars,
    imageUrl: normalizeReviewImage(value.image_url),
    platform,
    createdAt,
  };
}

function normalizeExternalReviewPage(
  value: unknown,
): Omit<ProfileExternalReviewPage, "position"> | null {
  if (!isRecord(value) || value.enabled === false) return null;
  const id = positiveInteger(value.id);
  const href = nonBlankString(value.link);
  if (!id || !href || /[\u0000-\u001f\u007f]/.test(href)) return null;

  try {
    const url = new URL(href);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return {
      id,
      href,
      label: url.hostname.replace(/^www\./i, ""),
    };
  } catch {
    return null;
  }
}

export function selectProfileReviews(
  reviewRows: unknown,
  externalReviewPageRows: unknown,
): ProfileReviewsSelection {
  const reviews = Array.isArray(reviewRows)
    ? reviewRows.flatMap((row) => {
        const review = normalizeReview(row);
        return review ? [review] : [];
      })
    : [];
  const externalReviewPages = Array.isArray(externalReviewPageRows)
    ? externalReviewPageRows.flatMap((row) => {
        const page = normalizeExternalReviewPage(row);
        return page ? [page] : [];
      })
    : [];

  return {
    reviews: reviews.map((review, index) => ({
      ...review,
      position: index + 1,
    })),
    externalReviewPages: externalReviewPages.map((page, index) => ({
      ...page,
      position: index + 1,
    })),
  };
}
