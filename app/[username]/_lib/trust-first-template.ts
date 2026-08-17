import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

type Review = {
  id: number;
  content: string | null;
  stars: number | null;
  rank: number | null;
  reviewer_name?: string | null;
};

type Treatment = {
  treatment_id: string;
  rank: number;
  treatments: {
    title: string | null;
    description: string | null;
    isService: boolean | null;
  } | null;
};

type BlogEntry = {
  id: number;
  group_id: number | null;
  title: string | null;
  slug: string | null;
  image_url: unknown;
  enabled: boolean | null;
};

type BlogGroup = {
  id: number;
  name: string | null;
  enabled: boolean | null;
  blogs: readonly (BlogEntry | null | undefined)[] | null | undefined;
};

export type TrustFirstBlogPost = {
  id: number;
  title: string;
  slug: string;
  imageUrl: string | null;
  position: number;
};

export type TrustFirstBlogGroup = {
  id: number;
  name: string;
  blogs: readonly TrustFirstBlogPost[];
};

const PUBLIC_BLOG_SLUG_PATTERN = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;
const PUBLIC_BLOG_IMAGE_PATH_PATTERN = /^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result || null;
}

export function normalizeTrustFirstBlogImageUrl(value: unknown): string | null {
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

export function selectTrustFirstBlogGroups(
  groups: readonly (BlogGroup | null | undefined)[] | null | undefined,
): TrustFirstBlogGroup[] {
  if (!Array.isArray(groups)) return [];

  const seenGroups = new Set<number>();
  const seenBlogs = new Set<number>();
  let position = 0;

  return groups.flatMap((group): TrustFirstBlogGroup[] => {
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
    const blogs = sourceBlogs.flatMap((blog): TrustFirstBlogPost[] => {
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
          imageUrl: normalizeTrustFirstBlogImageUrl(blog.image_url),
          position,
        },
      ];
    });

    return blogs.length > 0 ? [{ id: group.id, name, blogs }] : [];
  });
}

export type TrustPriorityInformation = NonNullable<
  ProfileTemplateAnswers["trust-first-family-practice"]["priorityInformation"]
>[number];

export const TRUST_PRIORITY_COPY: Record<
  TrustPriorityInformation,
  { title: string; description: string }
> = {
  payment: {
    title: "Payment options",
    description:
      "Ask the practice about ways to plan and spread treatment costs.",
  },
  insurance: {
    title: "Insurance support",
    description:
      "Contact the team to check your policy and available claim support.",
  },
  accessibility: {
    title: "Accessible visits",
    description:
      "Tell the team what would make your appointment easier before you arrive.",
  },
  "anxiety-care": {
    title: "Anxiety-aware care",
    description:
      "Share any worries in advance so your appointment can move at a comfortable pace.",
  },
};

function hasReviewContent(review: Review) {
  return Boolean(review.content?.trim() || review.stars);
}

export function selectTrustFirstReviews(
  answers: ProfileTemplateAnswers["trust-first-family-practice"],
  reviews: readonly Review[],
) {
  const eligible = reviews.filter(hasReviewContent);
  const byId = new Map(eligible.map((review) => [String(review.id), review]));

  if (answers.featuredReviewIds?.length) {
    return answers.featuredReviewIds
      .flatMap((id) => {
        const review = byId.get(id);
        return review ? [review] : [];
      })
      .slice(0, 2);
  }

  return eligible
    .slice()
    .sort(
      (a, b) =>
        (a.rank ?? Number.MAX_SAFE_INTEGER) -
        (b.rank ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 2);
}

export function selectTrustFirstTreatments(treatments: readonly Treatment[]) {
  return treatments
    .filter(
      (treatment) =>
        treatment.treatments && treatment.treatments.isService !== true,
    )
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);
}

export function getTrustPriorityInformation(
  answers: ProfileTemplateAnswers["trust-first-family-practice"],
) {
  return (answers.priorityInformation ?? []).map((id) => ({
    id,
    ...TRUST_PRIORITY_COPY[id],
  }));
}

export function normalizeTrustFirstHttpUrl(value: string | null) {
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
