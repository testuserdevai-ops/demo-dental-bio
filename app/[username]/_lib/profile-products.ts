type ProductCandidate = {
  id?: unknown;
  name?: unknown;
  link?: unknown;
  platform?: unknown;
  image_url?: unknown;
  price?: unknown;
  currency?: unknown;
  rank?: unknown;
  enabled?: unknown;
};

export type ProfileProduct = {
  id: string;
  name: string;
  link: string;
  platform?: string;
  image_url?: string;
  price?: string;
  currency?: string;
  rank: number | undefined;
  enabled: true;
  position: number;
};

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

function cleanBoundedText(value: unknown, maximum: number): string | null {
  const text = cleanText(value);
  return text && text.length <= maximum ? text : null;
}

function normalizePositiveInteger(value: unknown): number | null {
  const source =
    typeof value === "string" && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  return typeof source === "number" &&
    Number.isSafeInteger(source) &&
    source > 0
    ? source
    : null;
}

function normalizeRank(value: unknown): number | undefined {
  const source =
    typeof value === "string" && /^-?\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  return typeof source === "number" && Number.isSafeInteger(source)
    ? source
    : undefined;
}

function normalizeHttpsUrl(value: unknown): string | null {
  const input = cleanText(value);
  if (!input || input.length > 2048) return null;
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeCurrency(value: unknown): string | undefined {
  const currency = cleanBoundedText(value, 20);
  return currency && currencies.includes(currency) ? currency : undefined;
}

function normalizePrice(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return String(value);
  }
  if (typeof value === "string" && /^\d+(?:\.\d{1,2})?$/.test(value.trim())) {
    return value.trim();
  }
  return undefined;
}

function compareRankAndId(
  left: { rank: number | undefined; id: number },
  right: { rank: number | undefined; id: number },
) {
  return (
    (left.rank ?? Number.MAX_SAFE_INTEGER) -
      (right.rank ?? Number.MAX_SAFE_INTEGER) || left.id - right.id
  );
}

/** Selects all eligible products; a valid featured ID only changes ordering. */
export function selectProfileProducts(
  input: unknown,
  featuredProductId?: unknown,
): ProfileProduct[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<number>();
  const products = input.flatMap((candidate) => {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      return [];
    }
    const product = candidate as ProductCandidate;
    const id = normalizePositiveInteger(product.id);
    const name = cleanBoundedText(product.name, 150);
    const link = normalizeHttpsUrl(product.link);
    if (!id || seen.has(id) || product.enabled !== true || !name || !link) {
      return [];
    }
    seen.add(id);
    return [
      {
        id,
        name,
        link,
        platform: cleanBoundedText(product.platform, 100) ?? undefined,
        image_url: normalizeHttpsUrl(product.image_url) ?? undefined,
        price: normalizePrice(product.price),
        currency: normalizeCurrency(product.currency),
        rank: normalizeRank(product.rank),
        enabled: true as const,
      },
    ];
  });

  const ordered = products.slice().sort(compareRankAndId);
  const featuredId = normalizePositiveInteger(featuredProductId);
  const featured = featuredId
    ? ordered.find((product) => product.id === featuredId)
    : undefined;
  const featuredFirst = featured
    ? [featured, ...ordered.filter((product) => product.id !== featured.id)]
    : ordered;

  return featuredFirst.map((product, index) => ({
    ...product,
    id: String(product.id),
    position: index + 1,
  }));
}
import { currencies } from "@/utils/global_constants";
