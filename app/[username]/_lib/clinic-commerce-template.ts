import type { TrackableAction } from "@/lib/analytics/contract";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "./public-profile";
import { orderPublicBlogGroups } from "./profile-blog-order";

type Product = PublicProfileViewModel["products"][number];
type BlogEntry = {
  id: number;
  rank?: number | null;
  group_id: number | null;
  title: string | null;
  slug: string | null;
  image_url: unknown;
  enabled: boolean | null;
};

type BlogGroup = {
  id: number;
  rank?: number | null;
  name: string | null;
  enabled: boolean | null;
  blogs: readonly (BlogEntry | null | undefined)[] | null | undefined;
};

export type CommerceProduct = Product & {
  id: string;
  href: string;
  label: string;
  position: number;
};

export type CommerceAction = {
  href: string;
  label: string;
  analytics: readonly TrackableAction[];
};

export type CommerceBlogPost = {
  id: number;
  title: string;
  slug: string;
  imageUrl: string | null;
  position: number;
};

export type CommerceBlogGroup = {
  id: number;
  name: string;
  blogs: CommerceBlogPost[];
};

export type CommerceGalleryCase = {
  id: number;
  title: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeLabel: string | null;
  afterLabel: string | null;
  position: number;
};

export type CommerceGeneralGalleryImage = {
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

const PUBLIC_BLOG_SLUG_PATTERN = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;
const PUBLIC_BLOG_IMAGE_PATH_PATTERN = /^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result || null;
}

function normalizeBlogImageUrl(value: unknown): string | null {
  const input = cleanText(value);
  if (!input) return null;

  if (input.startsWith("/")) {
    return PUBLIC_BLOG_IMAGE_PATH_PATTERN.test(input) && !input.includes("..")
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

function normalizeGalleryImageUrl(value: unknown): string | null {
  const input = cleanText(value);
  if (!input) return null;

  if (input.startsWith("/")) {
    return PUBLIC_BLOG_IMAGE_PATH_PATTERN.test(input) && !input.includes("..")
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

function isEnabledCandidate(value: GalleryCandidate | GeneralGalleryCandidate) {
  return !("enabled" in value) || value.enabled === true;
}

export function selectCommerceGallery(
  galleries: readonly unknown[] | null | undefined,
  generalGalleries: readonly unknown[] | null | undefined,
): {
  cases: CommerceGalleryCase[];
  generalImages: CommerceGeneralGalleryImage[];
} {
  const seenCases = new Set<number>();
  const seenGeneralImages = new Set<number>();
  let visiblePosition = 0;
  const cases = (Array.isArray(galleries) ? galleries : []).flatMap(
    (candidate): CommerceGalleryCase[] => {
      if (!candidate || typeof candidate !== "object") return [];
      const gallery = candidate as GalleryCandidate;
      const title = cleanText(gallery.title);
      const beforeImageUrl = normalizeGalleryImageUrl(gallery.before_image_url);
      const afterImageUrl = normalizeGalleryImageUrl(gallery.after_image_url);
      if (
        !Number.isSafeInteger(gallery.id) ||
        Number(gallery.id) <= 0 ||
        seenCases.has(Number(gallery.id)) ||
        !isEnabledCandidate(gallery) ||
        !title ||
        !beforeImageUrl ||
        !afterImageUrl
      ) {
        return [];
      }

      const id = Number(gallery.id);
      seenCases.add(id);
      visiblePosition += 1;
      return [
        {
          id,
          title,
          beforeImageUrl,
          afterImageUrl,
          beforeLabel: cleanText(gallery.before_image_label),
          afterLabel: cleanText(gallery.after_image_label),
          position: visiblePosition,
        },
      ];
    },
  );
  const generalImages = (
    Array.isArray(generalGalleries) ? generalGalleries : []
  ).flatMap((candidate): CommerceGeneralGalleryImage[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const gallery = candidate as GeneralGalleryCandidate;
    const title = cleanText(gallery.title);
    const imageUrl = normalizeGalleryImageUrl(gallery.image_url);
    if (
      !Number.isSafeInteger(gallery.id) ||
      Number(gallery.id) <= 0 ||
      seenGeneralImages.has(Number(gallery.id)) ||
      !isEnabledCandidate(gallery) ||
      !title ||
      !imageUrl
    ) {
      return [];
    }

    const id = Number(gallery.id);
    seenGeneralImages.add(id);
    visiblePosition += 1;
    return [
      {
        id,
        title,
        imageUrl,
        position: visiblePosition,
      },
    ];
  });

  return { cases, generalImages };
}

export function selectCommerceBlogGroups(
  groups: readonly (BlogGroup | null | undefined)[] | null | undefined,
): CommerceBlogGroup[] {
  if (!Array.isArray(groups)) return [];

  const seenGroups = new Set<number>();
  const seenBlogs = new Set<number>();
  let position = 0;

  return orderPublicBlogGroups(groups).flatMap((group): CommerceBlogGroup[] => {
    if (!group || typeof group !== "object") return [];
    const name = cleanText(group.name);
    if (
      group.enabled !== true ||
      !Number.isSafeInteger(group.id) ||
      group.id <= 0 ||
      seenGroups.has(group.id) ||
      !name
    ) {
      return [];
    }
    seenGroups.add(group.id);

    const sourceBlogs: readonly (BlogEntry | null | undefined)[] =
      Array.isArray(group.blogs) ? group.blogs : [];
    const blogs = sourceBlogs.flatMap((blog): CommerceBlogPost[] => {
      if (!blog || typeof blog !== "object") return [];
      const title = cleanText(blog.title);
      const slug = cleanText(blog.slug);
      if (
        blog.enabled !== true ||
        !Number.isSafeInteger(blog.id) ||
        blog.id <= 0 ||
        seenBlogs.has(blog.id) ||
        blog.group_id !== group.id ||
        !title ||
        !slug ||
        slug.length > 100 ||
        !PUBLIC_BLOG_SLUG_PATTERN.test(slug)
      ) {
        return [];
      }

      seenBlogs.add(blog.id);
      position += 1;
      return [
        {
          id: blog.id,
          title,
          slug,
          imageUrl: normalizeBlogImageUrl(blog.image_url),
          position,
        },
      ];
    });

    return blogs.length > 0 ? [{ id: group.id, name, blogs }] : [];
  });
}

function normalizeHttpUrl(value: string | null | undefined): string | null {
  const input = value?.trim();
  if (!input) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(input) ? input : `https://${input}`,
    );
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function selectCommerceProducts(
  answers: ProfileTemplateAnswers["clinic-commerce"],
  products: readonly Product[],
) {
  const eligible = products
    .filter((product) => product.enabled !== false)
    .slice()
    .sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0))
    .flatMap((product) => {
      const id = product.id?.trim();
      const label = product.name?.trim();
      const href = normalizeHttpUrl(product.link);
      return id && label && href ? [{ ...product, id, label, href }] : [];
    })
    .map((product, index) => ({ ...product, position: index + 1 }));
  const featured =
    eligible.find(({ id }) => id === answers.featuredProductId) ?? eligible[0];
  const orderedProducts = featured
    ? [featured, ...eligible.filter(({ id }) => id !== featured.id)]
    : eligible;

  return {
    featured: featured ? { ...featured, position: 1 } : null,
    products: orderedProducts.map((product, index) => ({
      ...product,
      position: index + 1,
    })),
  };
}

export function selectCommerceClinicAction(
  dentistry: Pick<
    PublicProfileViewModel["dentistry"],
    "booking_link" | "booking_link_enabled" | "website"
  >,
): CommerceAction | null {
  const bookingHref = dentistry.booking_link_enabled
    ? normalizeHttpUrl(dentistry.booking_link)
    : null;
  if (bookingHref) {
    return {
      href: bookingHref,
      label: "Book the clinic",
      analytics: [
        { section: "profile", action: { type: "booking_click" } },
        {
          section: "profile",
          action: { type: "cta_click", ctaType: "booking" },
        },
      ],
    };
  }

  const websiteHref = normalizeHttpUrl(dentistry.website);
  return websiteHref
    ? {
        href: websiteHref,
        label: "Visit the clinic",
        analytics: [
          {
            section: "profile",
            action: { type: "social_click", platform: "website" },
          },
          {
            section: "profile",
            action: { type: "cta_click", ctaType: "contact" },
          },
        ],
      }
    : null;
}

export function orderCommerceSections(
  defaultAudience: ProfileTemplateAnswers["clinic-commerce"]["defaultAudience"],
) {
  return defaultAudience === "shop"
    ? (["shop", "clinic"] as const)
    : (["clinic", "shop"] as const);
}
