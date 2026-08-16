import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

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
  title: string | null;
  slug: string | null;
  image_url: string | null;
  enabled: boolean | null;
};

type BlogGroup = {
  id: number;
  name: string | null;
  enabled?: boolean | null;
  blogs: readonly BlogEntry[];
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

export function selectExpertBlogGroups(blogGroups: readonly BlogGroup[]) {
  let position = 0;

  return blogGroups.flatMap((group): ExpertBlogGroup[] => {
    const name = group.name?.trim();
    if (
      group.enabled === false ||
      !Number.isSafeInteger(group.id) ||
      group.id <= 0 ||
      !name
    ) {
      return [];
    }

    const blogs = group.blogs.flatMap((blog): ExpertBlog[] => {
      const title = blog.title?.trim();
      const slug = blog.slug?.trim();
      if (
        blog.enabled === false ||
        !Number.isSafeInteger(blog.id) ||
        blog.id <= 0 ||
        !title ||
        !slug ||
        slug.length > 100 ||
        !PUBLIC_BLOG_SLUG_PATTERN.test(slug)
      ) {
        return [];
      }

      position += 1;
      return [
        {
          id: blog.id,
          title,
          slug,
          imageUrl: blog.image_url?.trim() || null,
          position,
        },
      ];
    });

    return blogs.length > 0 ? [{ id: group.id, name, blogs }] : [];
  });
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
