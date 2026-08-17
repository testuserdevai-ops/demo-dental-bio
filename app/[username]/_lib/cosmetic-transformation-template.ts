import type { TrackableAction } from "@/lib/analytics/contract";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import { orderPublicBlogGroups } from "./profile-blog-order";

type CosmeticAnswers = ProfileTemplateAnswers["cosmetic-transformation"];

type Gallery = {
  id: number;
  before_image_url: string | null;
  after_image_url: string | null;
  title: string | null;
  before_image_label: string | null;
  after_image_label: string | null;
};

type GeneralGallery = {
  id: number;
  image_url: string | null;
  title: string | null;
};

export type CosmeticGalleryCase = Gallery & {
  before_image_url: string;
  after_image_url: string;
  title: string;
};

export type CosmeticGeneralGallery = GeneralGallery & {
  image_url: string;
  title: string;
};

type CosmeticBlogEntry = {
  id: number;
  group_id?: number | null;
  rank?: number | null;
  title: string | null;
  slug: string | null;
  image_url: unknown;
  enabled: boolean | null;
};

type CosmeticBlogGroupInput = {
  id: number;
  rank?: number | null;
  name: string | null;
  enabled: boolean | null;
  blogs: readonly (CosmeticBlogEntry | null | undefined)[] | null | undefined;
};

export type CosmeticBlogPost = {
  id: number;
  title: string;
  slug: string;
  imageUrl: string | null;
  position: number;
};

export type CosmeticBlogGroup = {
  id: number;
  name: string;
  blogs: readonly CosmeticBlogPost[];
};

type DentistryActionSource = {
  booking_link: string | null;
  booking_link_enabled: boolean | null;
  contact_email: string | null;
  phone: string | null;
};

type LinkGroup = {
  link_group_id: string;
  dentistry_links: {
    links: {
      link_id: string;
      title: string | null;
      link: string | null;
      is_active: boolean;
      rank: number;
    };
  }[];
};

export type CosmeticConsultationAction = {
  href: string;
  label: string;
  external: boolean;
  analytics: TrackableAction | readonly TrackableAction[];
};

const PUBLIC_BLOG_SLUG_PATTERN = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;
const PUBLIC_BLOG_IMAGE_PATH_PATTERN = /^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

function normalizeCosmeticMediaImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
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

export function selectCosmeticBlogGroups(
  blogGroups:
    readonly (CosmeticBlogGroupInput | null | undefined)[] | null | undefined,
): CosmeticBlogGroup[] {
  if (!Array.isArray(blogGroups)) return [];

  const seenGroups = new Set<number>();
  const seenBlogs = new Set<number>();
  let position = 0;

  return orderPublicBlogGroups(blogGroups).flatMap(
    (group): CosmeticBlogGroup[] => {
      if (!group || typeof group !== "object") return [];
      const name = group.name?.trim();
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

      const sourceBlogs = Array.isArray(group.blogs) ? group.blogs : [];
      const blogs = sourceBlogs.flatMap(
        (blog: CosmeticBlogEntry | null | undefined): CosmeticBlogPost[] => {
          if (!blog || typeof blog !== "object") return [];
          const title = blog.title?.trim();
          const slug = blog.slug?.trim();
          if (
            blog.enabled !== true ||
            !Number.isSafeInteger(blog.id) ||
            blog.id <= 0 ||
            seenBlogs.has(blog.id) ||
            (blog.group_id !== undefined && blog.group_id !== group.id) ||
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
              imageUrl: normalizeCosmeticMediaImage(blog.image_url),
              position,
            },
          ];
        },
      );

      return blogs.length > 0 ? [{ id: group.id, name, blogs }] : [];
    },
  );
}

function normalizeHttpUrl(value: string | null): string | null {
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

function normalizePhone(value: string | null): string | null {
  const input = value?.trim();
  if (!input) return null;
  const prefix = input.startsWith("+") ? "+" : "";
  const digits = input.replace(/\D/g, "");
  return digits.length >= 7 ? `${prefix}${digits}` : null;
}

function normalizeEmail(value: string | null): string | null {
  const input = value?.trim();
  return input && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? input : null;
}

const consultationLabels = {
  free: "Book a free consultation",
  virtual: "Start a virtual consultation",
  "in-person": "Start an in-person consultation",
} as const;

export function selectCosmeticConsultationAction(
  answers: CosmeticAnswers,
  dentistry: DentistryActionSource,
  linkGroups: readonly LinkGroup[],
): CosmeticConsultationAction | null {
  const kind = answers.consultationKind ?? "in-person";
  const linkCandidates = linkGroups
    .flatMap((group) =>
      group.dentistry_links.map(({ links }) => ({
        ...links,
        groupId: group.link_group_id,
      })),
    )
    .filter(({ is_active }) => is_active)
    .sort((a, b) => a.rank - b.rank);
  const desiredPattern =
    kind === "virtual"
      ? /virtual|video|online/i
      : kind === "free"
        ? /free.*consult|consult.*free/i
        : /consult|assessment/i;
  const matchingLink = linkCandidates.find(({ link, title }) => {
    return normalizeHttpUrl(link) && desiredPattern.test(title?.trim() ?? "");
  });
  const matchingHref = normalizeHttpUrl(matchingLink?.link ?? null);

  if (matchingLink && matchingHref) {
    return {
      href: matchingHref,
      label: consultationLabels[kind],
      external: true,
      analytics: [
        {
          section: "links",
          action: {
            type: "link_click",
            linkId: matchingLink.link_id,
            groupId: matchingLink.groupId,
          },
        },
        {
          section: "profile",
          action: { type: "cta_click", ctaType: "enquiry" },
        },
      ],
    };
  }

  const bookingHref = dentistry.booking_link_enabled
    ? normalizeHttpUrl(dentistry.booking_link)
    : null;
  if (bookingHref) {
    return {
      href: bookingHref,
      label: consultationLabels[kind],
      external: true,
      analytics: [
        { section: "profile", action: { type: "booking_click" } },
        {
          section: "profile",
          action: { type: "cta_click", ctaType: "booking" },
        },
      ],
    };
  }

  const email = normalizeEmail(dentistry.contact_email);
  if (email) {
    return {
      href: `mailto:${email}`,
      label: "Ask about a consultation",
      external: false,
      analytics: [
        { section: "profile", action: { type: "email_click" } },
        {
          section: "profile",
          action: { type: "cta_click", ctaType: "email" },
        },
      ],
    };
  }

  const phone = normalizePhone(dentistry.phone);
  return phone
    ? {
        href: `tel:${phone}`,
        label: "Call about a consultation",
        external: false,
        analytics: [
          { section: "profile", action: { type: "phone_click" } },
          {
            section: "profile",
            action: { type: "cta_click", ctaType: "phone" },
          },
        ],
      }
    : null;
}

export function selectCosmeticGalleries(
  answers: CosmeticAnswers,
  galleries: readonly Gallery[],
): CosmeticGalleryCase[] {
  const eligible = galleries.flatMap((gallery): CosmeticGalleryCase[] => {
    const title = gallery.title?.trim();
    const beforeImageUrl = normalizeCosmeticMediaImage(
      gallery.before_image_url,
    );
    const afterImageUrl = normalizeCosmeticMediaImage(gallery.after_image_url);
    if (
      !Number.isSafeInteger(gallery.id) ||
      gallery.id <= 0 ||
      !title ||
      !beforeImageUrl ||
      !afterImageUrl
    ) {
      return [];
    }

    return [
      {
        ...gallery,
        title,
        before_image_url: beforeImageUrl,
        after_image_url: afterImageUrl,
      },
    ];
  });
  const byId = new Map(
    eligible.map((gallery) => [String(gallery.id), gallery]),
  );
  const ordered: CosmeticGalleryCase[] = [];
  const seen = new Set<number>();

  for (const id of answers.featuredGalleryIds ?? []) {
    const gallery = byId.get(id);
    if (gallery && !seen.has(gallery.id)) {
      ordered.push(gallery);
      seen.add(gallery.id);
    }
  }
  for (const gallery of eligible) {
    if (!seen.has(gallery.id)) ordered.push(gallery);
  }

  return ordered;
}

export function selectCosmeticGeneralGalleries(
  galleries: readonly GeneralGallery[],
): CosmeticGeneralGallery[] {
  return galleries.flatMap((gallery): CosmeticGeneralGallery[] => {
    const title = gallery.title?.trim();
    const imageUrl = normalizeCosmeticMediaImage(gallery.image_url);
    if (
      !Number.isSafeInteger(gallery.id) ||
      gallery.id <= 0 ||
      !title ||
      !imageUrl
    ) {
      return [];
    }

    return [{ ...gallery, title, image_url: imageUrl }];
  });
}
