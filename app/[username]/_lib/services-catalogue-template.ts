import type { TrackableAction } from "@/lib/analytics/contract";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "./public-profile";

type LinkGroup = PublicProfileViewModel["linkGroups"][number];

type CatalogueBlogEntry = {
  id: unknown;
  group_id: unknown;
  title: unknown;
  slug: unknown;
  image_url: unknown;
  enabled: unknown;
};

type CatalogueBlogGroupInput = {
  id: unknown;
  name: unknown;
  enabled: unknown;
  blogs: unknown;
};

export type CatalogueResourceKind = "financing" | "team" | "faq";

export type CatalogueResource = {
  groupId: string;
  id: string;
  kind: CatalogueResourceKind;
  label: string;
  href: string;
  position: number;
  presentation: {
    imageUrl: string | null;
    imageVariant: string;
    imageAlt: string | null;
    imageDecorative: boolean;
    isFeatured: boolean;
  };
};

export type CatalogueAction = {
  href: string;
  label: string;
  analytics: readonly TrackableAction[];
};

export type CatalogueBlogPost = {
  id: number;
  title: string;
  slug: string;
  imageUrl: string | null;
  position: number;
};

export type CatalogueBlogGroup = {
  id: number;
  name: string;
  blogs: CatalogueBlogPost[];
};

const PUBLIC_BLOG_SLUG_PATTERN = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;
const PUBLIC_BLOG_IMAGE_PATH_PATTERN = /^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

function cleanCatalogueBlogText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

export function normalizeCatalogueBlogImageUrl(value: unknown): string | null {
  const input = cleanCatalogueBlogText(value);
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

export function selectCatalogueBlogGroups(
  groups: readonly unknown[] | null | undefined,
): CatalogueBlogGroup[] {
  if (!Array.isArray(groups)) return [];

  const seenGroups = new Set<number>();
  const seenBlogs = new Set<number>();
  let position = 0;

  return groups.flatMap((candidate): CatalogueBlogGroup[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const group = candidate as CatalogueBlogGroupInput;
    const name = cleanCatalogueBlogText(group.name);
    if (
      group.enabled !== true ||
      typeof group.id !== "number" ||
      !Number.isSafeInteger(group.id) ||
      group.id <= 0 ||
      seenGroups.has(group.id) ||
      !name
    ) {
      return [];
    }
    seenGroups.add(group.id);

    const sourceBlogs = Array.isArray(group.blogs) ? group.blogs : [];
    const blogs = sourceBlogs.flatMap((candidateBlog): CatalogueBlogPost[] => {
      if (!candidateBlog || typeof candidateBlog !== "object") return [];
      const blog = candidateBlog as CatalogueBlogEntry;
      const title = cleanCatalogueBlogText(blog.title);
      const slug = cleanCatalogueBlogText(blog.slug);
      if (
        blog.enabled !== true ||
        typeof blog.id !== "number" ||
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
          imageUrl: normalizeCatalogueBlogImageUrl(blog.image_url),
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
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function byRank<T extends { rank: number }>(left: T, right: T) {
  return left.rank - right.rank;
}

function classifyResource(value: string): CatalogueResourceKind | null {
  if (/financ|payment|insurance|cost/i.test(value)) return "financing";
  if (/team|clinician|dentist|hygienist/i.test(value)) return "team";
  if (/faq|question|guide|aftercare|resource/i.test(value)) return "faq";
  return null;
}

export function selectCatalogueResources(
  linkGroups: readonly LinkGroup[],
): CatalogueResource[] {
  return linkGroups
    .slice()
    .sort(byRank)
    .flatMap((group) =>
      group.dentistry_links
        .map(({ links }) => ({ links, group }))
        .filter(({ links }) => links.is_active)
        .sort((left, right) => left.links.rank - right.links.rank),
    )
    .flatMap(({ links, group }) => {
      const href = normalizeHttpUrl(links.link);
      const label = links.title?.trim();
      const kind = label
        ? (classifyResource(label) ??
          classifyResource(group.heading?.trim() ?? ""))
        : null;
      if (!href || !label || !kind) return [];

      return [
        {
          groupId: group.link_group_id,
          id: links.link_id,
          kind,
          label,
          href,
          position: 0,
          presentation: {
            imageUrl: links.image_url,
            imageVariant: links.image_variant,
            imageAlt: links.image_alt,
            imageDecorative: links.image_decorative,
            isFeatured: links.is_featured,
          },
        },
      ];
    })
    .map((resource, index) => ({ ...resource, position: index + 1 }));
}

export function orderCataloguePracticalSections(
  showFinancingBeforeTeam: boolean | undefined,
) {
  return showFinancingBeforeTeam
    ? (["financing", "team", "faq"] as const)
    : (["team", "financing", "faq"] as const);
}

export function selectCataloguePrimaryAction(
  dentistry: Pick<
    PublicProfileViewModel["dentistry"],
    "booking_link" | "booking_link_enabled" | "website"
  >,
): CatalogueAction | null {
  const bookingHref = dentistry.booking_link_enabled
    ? normalizeHttpUrl(dentistry.booking_link)
    : null;
  if (bookingHref) {
    return {
      href: bookingHref,
      label: "Book a consultation",
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
        label: "Explore the practice",
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
