import type { TrackableAction } from "@/lib/analytics/contract";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

type DentistryActionSource = {
  booking_link: string | null;
  booking_link_enabled: boolean | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
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

type Treatment = {
  treatment_id: string;
  rank: number;
  treatments: {
    title: string | null;
    description: string | null;
    isService: boolean | null;
  } | null;
};

type DirectBookingBlogEntry = {
  id: number;
  group_id: number | null;
  title: string | null;
  slug: string | null;
  image_url: unknown;
  enabled: boolean | null;
};

type DirectBookingBlogGroupInput = {
  id: number;
  name: string | null;
  enabled: boolean | null;
  blogs:
    readonly (DirectBookingBlogEntry | null | undefined)[] | null | undefined;
};

export type DirectBookingBlogPost = {
  id: number;
  title: string;
  slug: string;
  imageUrl: string | null;
  position: number;
};

export type DirectBookingBlogGroup = {
  id: number;
  name: string;
  blogs: DirectBookingBlogPost[];
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

export function selectDirectBookingBlogGroups(
  groups:
    | readonly (DirectBookingBlogGroupInput | null | undefined)[]
    | null
    | undefined,
): DirectBookingBlogGroup[] {
  if (!Array.isArray(groups)) return [];

  const seenGroups = new Set<number>();
  const seenBlogs = new Set<number>();
  let position = 0;

  return groups.flatMap((group): DirectBookingBlogGroup[] => {
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

    const sourceBlogs: readonly (DirectBookingBlogEntry | null | undefined)[] =
      Array.isArray(group.blogs) ? group.blogs : [];
    const blogs = sourceBlogs.flatMap((blog): DirectBookingBlogPost[] => {
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

type DirectActionKind = NonNullable<
  ProfileTemplateAnswers["direct-booking"]["primaryAction"]
>;

export type DirectBookingAction = {
  kind: DirectActionKind;
  label: string;
  href: string;
  analytics: TrackableAction | readonly TrackableAction[];
  external: boolean;
};

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

function findAssessmentLink(linkGroups: readonly LinkGroup[]) {
  return linkGroups
    .flatMap((group) =>
      group.dentistry_links.map(({ links }) => ({
        ...links,
        groupId: group.link_group_id,
      })),
    )
    .filter(({ is_active }) => is_active)
    .sort((a, b) => a.rank - b.rank)
    .find(({ link, title }) => {
      return (
        normalizeHttpUrl(link) &&
        /assessment|consultation/i.test(title?.trim() ?? "")
      );
    });
}

export function resolveDirectBookingAction(
  kind: DirectActionKind,
  dentistry: DentistryActionSource,
  linkGroups: readonly LinkGroup[],
): DirectBookingAction | null {
  if (kind === "booking") {
    const href = dentistry.booking_link_enabled
      ? normalizeHttpUrl(dentistry.booking_link)
      : null;
    return href
      ? {
          kind,
          label: "Book an appointment",
          href,
          external: true,
          analytics: [
            { section: "profile", action: { type: "booking_click" } },
            {
              section: "profile",
              action: { type: "cta_click", ctaType: "booking" },
            },
          ],
        }
      : null;
  }

  if (kind === "website") {
    const href = normalizeHttpUrl(dentistry.website);
    return href
      ? {
          kind,
          label: "Visit website",
          href,
          external: true,
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

  if (kind === "phone") {
    const phone = normalizePhone(dentistry.phone);
    return phone
      ? {
          kind,
          label: "Call the practice",
          href: `tel:${phone}`,
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

  if (kind === "email") {
    const email = normalizeEmail(dentistry.contact_email);
    return email
      ? {
          kind,
          label: "Email the practice",
          href: `mailto:${email}`,
          external: false,
          analytics: [
            { section: "profile", action: { type: "email_click" } },
            {
              section: "profile",
              action: { type: "cta_click", ctaType: "email" },
            },
          ],
        }
      : null;
  }

  if (kind === "whatsapp") {
    const phone = normalizePhone(dentistry.phone)?.replace(/^\+/, "");
    return phone
      ? {
          kind,
          label: "Message on WhatsApp",
          href: `https://wa.me/${phone}`,
          external: true,
          analytics: {
            section: "profile",
            action: { type: "cta_click", ctaType: "contact" },
          },
        }
      : null;
  }

  const assessmentLink = findAssessmentLink(linkGroups);
  const href = normalizeHttpUrl(assessmentLink?.link ?? null);
  return assessmentLink && href
    ? {
        kind,
        label: "Start an assessment",
        href,
        external: true,
        analytics: [
          {
            section: "links",
            action: {
              type: "link_click",
              linkId: assessmentLink.link_id,
              groupId: assessmentLink.groupId,
            },
          },
          {
            section: "profile",
            action: { type: "cta_click", ctaType: "enquiry" },
          },
        ],
      }
    : null;
}

const fallbackActionOrder: readonly DirectActionKind[] = [
  "booking",
  "website",
  "whatsapp",
  "phone",
  "email",
  "assessment",
];

const secondaryActionOrder: readonly DirectActionKind[] = [
  "website",
  "whatsapp",
  "phone",
  "email",
];

export function selectDirectBookingActions(
  answers: ProfileTemplateAnswers["direct-booking"],
  dentistry: DentistryActionSource,
  linkGroups: readonly LinkGroup[],
) {
  const configuredPrimary = answers.primaryAction
    ? resolveDirectBookingAction(answers.primaryAction, dentistry, linkGroups)
    : null;
  const primary =
    configuredPrimary ??
    fallbackActionOrder
      .map((kind) => resolveDirectBookingAction(kind, dentistry, linkGroups))
      .find((action): action is DirectBookingAction => Boolean(action)) ??
    null;

  const secondaryAnswer = answers.secondaryAction;
  const configuredSecondary =
    secondaryAnswer && secondaryActionOrder.includes(secondaryAnswer)
      ? resolveDirectBookingAction(secondaryAnswer, dentistry, linkGroups)
      : null;
  const secondary =
    configuredSecondary && configuredSecondary.kind !== primary?.kind
      ? configuredSecondary
      : (secondaryActionOrder
          .filter((kind) => kind !== primary?.kind)
          .map((kind) =>
            resolveDirectBookingAction(kind, dentistry, linkGroups),
          )
          .find((action): action is DirectBookingAction => Boolean(action)) ??
        null);

  return { primary, secondary };
}

export function selectFeaturedTreatments(
  answers: ProfileTemplateAnswers["direct-booking"],
  treatments: readonly Treatment[],
) {
  const eligible = treatments.filter(
    (treatment) =>
      treatment.treatments?.title?.trim() &&
      treatment.treatments.isService !== true,
  );
  const byId = new Map(
    eligible.map((treatment) => [treatment.treatment_id, treatment]),
  );

  if (answers.featuredTreatmentIds?.length) {
    return answers.featuredTreatmentIds
      .flatMap((id) => {
        const treatment = byId.get(id);
        return treatment ? [treatment] : [];
      })
      .slice(0, 3);
  }

  return eligible
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);
}
