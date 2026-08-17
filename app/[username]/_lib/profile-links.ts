import { resolvePublicLinkPresentation } from "@/lib/public-profile/link-presentation";

type UnknownRecord = Record<string, unknown>;

export type ProfileLink = {
  id: string;
  groupId: string;
  href: string;
  label: string;
  position: number;
  presentation: ReturnType<typeof resolvePublicLinkPresentation>;
};

export type ProfileLinkGroup = {
  id: string;
  heading: string | null;
  links: ProfileLink[];
};

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rank(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number.MAX_SAFE_INTEGER;
}

export function normalizeProfileLinkHref(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate || candidate.length > 2048) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/**
 * Returns every eligible owner-saved link in deterministic rank order.
 * Titles and group headings are presentation only and never classify links.
 */
export function selectProfileLinks(value: unknown): ProfileLinkGroup[] {
  if (!Array.isArray(value)) return [];

  let position = 0;
  return value
    .flatMap((candidate) => {
      const group = record(candidate);
      const id = text(group?.link_group_id);
      if (!group || !id || !Array.isArray(group.dentistry_links)) return [];

      return [
        {
          id,
          heading: text(group.heading),
          rank: rank(group.rank),
          entries: group.dentistry_links,
        },
      ];
    })
    .sort((left, right) =>
      left.rank === right.rank
        ? left.id.localeCompare(right.id)
        : left.rank - right.rank,
    )
    .flatMap((group) => {
      const links = group.entries
        .flatMap((candidate) => {
          const join = record(candidate);
          const link = record(join?.links);
          const id = text(link?.link_id);
          const label = text(link?.title);
          const href = normalizeProfileLinkHref(link?.link);
          if (!link || !id || !label || !href || link.is_active !== true) {
            return [];
          }

          return [
            {
              id,
              href,
              label,
              rank: rank(link.rank),
              presentation: resolvePublicLinkPresentation({
                variant: link.image_variant,
                imageUrl: link.image_url,
                imageAlt: link.image_alt,
                decorative: link.image_decorative,
                featured: link.is_featured,
              }),
            },
          ];
        })
        .sort((left, right) =>
          left.rank === right.rank
            ? left.id.localeCompare(right.id)
            : left.rank - right.rank,
        )
        .map((link) => ({
          ...link,
          groupId: group.id,
          position: (position += 1),
        }));

      return links.length > 0
        ? [{ id: group.id, heading: group.heading, links }]
        : [];
    });
}
