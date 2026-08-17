import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

export type LocationRouterLocation = {
  location_id: string | null;
  locations: {
    country: string | null;
    city: string | null;
    area: string | null;
    latitude: number | null;
    longitude: number | null;
    full_address: string | null;
    business_name: string | null;
    image_url: string | null;
    image_alt: string | null;
    image_decorative: boolean;
  } | null;
};

export type LocationRouterOption = {
  id: string;
  label: string;
  summary: string;
  position: number;
  location: NonNullable<LocationRouterLocation["locations"]>;
};

export type LocationRouterMode = NonNullable<
  ProfileTemplateAnswers["location-provider-router"]["routerKind"]
>;

export type LocationRouterCopy = {
  eyebrow: string;
  selectorLabel: string;
  introduction: string;
};

export type LocationRouterBlogInput = {
  id: number;
  group_id: number | null;
  title: string;
  slug: string;
  image_url: string | null;
  enabled: boolean | null;
};

export type LocationRouterBlogGroupInput = {
  id: number;
  name: string | null;
  enabled?: boolean | null;
  blogs: readonly (LocationRouterBlogInput | null | undefined)[] | null;
};

export type LocationRouterBlogPost = {
  id: number;
  groupId: number;
  title: string;
  slug: string;
  imageUrl: string | null;
  position: number;
};

export type LocationRouterBlogSection = {
  id: number;
  name: string;
  blogs: LocationRouterBlogPost[];
};

const routerCopy: Record<LocationRouterMode, LocationRouterCopy> = {
  location: {
    eyebrow: "Choose a practice",
    selectorLabel: "Practice location",
    introduction:
      "Select the practice that suits you to see its details and contact options.",
  },
  provider: {
    eyebrow: "Choose your care team",
    selectorLabel: "Clinician location",
    introduction:
      "Select the clinic where you would like to meet the right clinician for your care.",
  },
  "appointment-type": {
    eyebrow: "Choose your appointment path",
    selectorLabel: "Appointment location",
    introduction:
      "Select where you would like to be seen to continue with the right appointment route.",
  },
};

function clean(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : null;
}

function normalizeBlogImageUrl(value: unknown): string | null {
  const input = clean(value);
  if (!input) return null;

  if (
    input.startsWith("/") &&
    /^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(input) &&
    !input.includes("..")
  ) {
    return input;
  }

  try {
    const url = new URL(input);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

const publicBlogSlugPattern = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;

export function createLocationRouterBlogSections(
  groups:
    | readonly (LocationRouterBlogGroupInput | null | undefined)[]
    | null
    | undefined,
): LocationRouterBlogSection[] {
  if (!Array.isArray(groups)) return [];

  const seenGroups = new Set<number>();
  const seenBlogs = new Set<number>();

  return groups.flatMap((group) => {
    if (!group || typeof group !== "object") return [];

    const name = clean(group.name);
    if (
      !Number.isSafeInteger(group.id) ||
      group.id <= 0 ||
      seenGroups.has(group.id) ||
      (group.enabled !== undefined && group.enabled !== true) ||
      !name
    ) {
      return [];
    }
    seenGroups.add(group.id);

    const relatedBlogs: readonly (
      LocationRouterBlogInput | null | undefined
    )[] = Array.isArray(group.blogs) ? group.blogs : [];
    const blogs = relatedBlogs.flatMap(
      (blog): Omit<LocationRouterBlogPost, "position">[] => {
        if (!blog || typeof blog !== "object") return [];

        const title = clean(blog.title);
        const slug = clean(blog.slug);
        if (
          blog.enabled !== true ||
          !Number.isSafeInteger(blog.id) ||
          blog.id <= 0 ||
          seenBlogs.has(blog.id) ||
          blog.group_id !== group.id ||
          !title ||
          !slug ||
          !publicBlogSlugPattern.test(slug)
        ) {
          return [];
        }
        seenBlogs.add(blog.id);

        return [
          {
            id: blog.id,
            groupId: group.id,
            title,
            slug,
            imageUrl: normalizeBlogImageUrl(blog.image_url),
          },
        ];
      },
    );

    if (blogs.length === 0) return [];

    return [
      {
        id: group.id,
        name,
        blogs: blogs.map((blog, index) => ({
          ...blog,
          position: index + 1,
        })),
      },
    ];
  });
}

export function getLocationRouterCopy(
  answers: ProfileTemplateAnswers["location-provider-router"],
): LocationRouterCopy {
  return routerCopy[answers.routerKind ?? "location"];
}

export function getLocationRouterLabel(
  location: NonNullable<LocationRouterLocation["locations"]>,
): string {
  return (
    clean(location.business_name) ??
    clean(location.city) ??
    clean(location.area) ??
    "Practice location"
  );
}

export function getLocationRouterSummary(
  location: NonNullable<LocationRouterLocation["locations"]>,
): string {
  return (
    clean(location.full_address) ??
    [location.area, location.city, location.country]
      .map(clean)
      .filter((part): part is string => Boolean(part))
      .join(", ") ??
    ""
  );
}

export function createLocationRouterState(
  answers: ProfileTemplateAnswers["location-provider-router"],
  locations: readonly LocationRouterLocation[],
): {
  options: LocationRouterOption[];
  defaultOptionId: string | null;
  recoveredDefault: boolean;
} {
  const seen = new Set<string>();
  const options = locations.flatMap((entry) => {
    if (!entry.location_id || !entry.locations || seen.has(entry.location_id)) {
      return [];
    }

    seen.add(entry.location_id);
    return [
      {
        id: entry.location_id,
        label: getLocationRouterLabel(entry.locations),
        summary: getLocationRouterSummary(entry.locations),
        position: seen.size,
        location: entry.locations,
      },
    ];
  });
  const configuredDefault = answers.defaultLocationId;
  const hasConfiguredDefault = options.some(
    ({ id }) => id === configuredDefault,
  );

  return {
    options,
    defaultOptionId: hasConfiguredDefault
      ? configuredDefault!
      : (options[0]?.id ?? null),
    recoveredDefault: Boolean(configuredDefault && !hasConfiguredDefault),
  };
}

function normalizeHttpUrl(value: string | null): string | null {
  const input = clean(value);
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

export function createLocationRouterBookingHref(dentistry: {
  booking_link: string | null;
  booking_link_enabled: boolean | null;
}): string | null {
  return dentistry.booking_link_enabled
    ? normalizeHttpUrl(dentistry.booking_link)
    : null;
}

export function createLocationRouterPhoneHref(value: string | null) {
  const input = clean(value);
  if (!input) return null;
  const prefix = input.startsWith("+") ? "+" : "";
  const digits = input.replace(/\D/g, "");
  return digits.length >= 7 ? `tel:${prefix}${digits}` : null;
}

export function createLocationRouterEmailHref(value: string | null) {
  const input = clean(value);
  return input && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
    ? `mailto:${input}`
    : null;
}
