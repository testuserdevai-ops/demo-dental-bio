import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import { orderPublicBlogGroups } from "./profile-blog-order";

type LinkGroup = {
  link_group_id: string;
  heading: string | null;
  rank: number;
  dentistry_links: readonly {
    links: {
      link_id: string;
      title: string | null;
      link: string | null;
      is_active: boolean;
      rank: number;
      image_url: string | null;
      image_variant: string;
      image_alt: string | null;
      image_decorative: boolean;
      is_featured: boolean;
    };
  }[];
};

type BlogEntry = {
  id: number;
  group_id?: number | null;
  rank?: number | null;
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

export type ExpertResource = LinkGroup["dentistry_links"][number]["links"] & {
  groupId: string;
  groupHeading: string;
};

export type ExpertBlog = {
  id: number;
  title: string;
  slug: string;
  imageUrl: string | null;
  position: number;
};

export type ExpertBlogGroup = {
  id: number;
  name: string;
  blogs: readonly ExpertBlog[];
};

const PUBLIC_BLOG_SLUG_PATTERN = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;
const PUBLIC_BLOG_IMAGE_PATH_PATTERN = /^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

export function normalizeExpertBlogImageUrl(value: unknown): string | null {
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

export function selectExpertBlogGroups(
  blogGroups: readonly (BlogGroup | null | undefined)[] | null | undefined,
) {
  if (!Array.isArray(blogGroups)) return [];

  const seenGroups = new Set<number>();
  const seenBlogs = new Set<number>();
  let position = 0;

  return orderPublicBlogGroups(blogGroups).flatMap(
    (group): ExpertBlogGroup[] => {
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
        (blog: BlogEntry | null | undefined): ExpertBlog[] => {
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
              imageUrl: normalizeExpertBlogImageUrl(blog.image_url),
              position,
            },
          ];
        },
      );

      return blogs.length > 0 ? [{ id: group.id, name, blogs }] : [];
    },
  );
}

export function normalizeExpertHttpUrl(value: string | null) {
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

export function selectExpertResources(linkGroups: readonly LinkGroup[]) {
  return linkGroups
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .flatMap((group) =>
      group.dentistry_links
        .map(({ links }) => ({
          ...links,
          groupId: group.link_group_id,
          groupHeading: group.heading?.trim() || "Resources",
        }))
        .filter(
          ({ is_active, link }) =>
            is_active && normalizeExpertHttpUrl(link) !== null,
        )
        .sort((a, b) => a.rank - b.rank),
    );
}

export function selectFeaturedExpertResource(
  answers: ProfileTemplateAnswers["expert-educator"],
  resources: readonly ExpertResource[],
) {
  const requested = answers.featuredContentId
    ? resources.find(({ link_id }) => link_id === answers.featuredContentId)
    : null;

  return (
    requested ??
    resources.find(({ is_featured }) => is_featured) ??
    resources[0] ??
    null
  );
}

const PROFESSIONAL_PATTERN =
  /professional|clinician|course|lecture|webinar|conference|research|journal|cpd|peer/i;

export function splitExpertResources(resources: readonly ExpertResource[]) {
  const professionals: ExpertResource[] = [];
  const patients: ExpertResource[] = [];

  for (const resource of resources) {
    const searchable = `${resource.groupHeading} ${resource.title ?? ""}`;
    (PROFESSIONAL_PATTERN.test(searchable) ? professionals : patients).push(
      resource,
    );
  }

  return { patients, professionals };
}

export function getExpertAudienceOrder(
  answers: ProfileTemplateAnswers["expert-educator"],
) {
  return answers.defaultAudience === "professionals"
    ? (["professionals", "patients"] as const)
    : (["patients", "professionals"] as const);
}
