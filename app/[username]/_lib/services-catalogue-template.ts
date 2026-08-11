import type { TrackableAction } from "@/lib/analytics/contract";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "./public-profile";

type Treatment = PublicProfileViewModel["treatments"][number];
type LinkGroup = PublicProfileViewModel["linkGroups"][number];

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

export function selectCatalogueTreatments(
  answers: ProfileTemplateAnswers["services-catalogue"],
  treatments: readonly Treatment[],
) {
  const eligible = treatments
    .filter(({ treatments: treatment }) => Boolean(treatment))
    .slice()
    .sort(byRank);
  const requested = new Set(answers.featuredTreatmentIds ?? []);
  const selected = eligible.filter(({ treatment_id }) =>
    requested.has(treatment_id),
  );
  const featured = (selected.length > 0 ? selected : eligible).slice(0, 3);
  const featuredIds = new Set(featured.map(({ treatment_id }) => treatment_id));

  return {
    featured,
    treatments: eligible.filter(
      ({ treatment_id, treatments: treatment }) =>
        !featuredIds.has(treatment_id) && treatment?.isService !== true,
    ),
    services: eligible.filter(
      ({ treatment_id, treatments: treatment }) =>
        !featuredIds.has(treatment_id) && treatment?.isService === true,
    ),
  };
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
      const kind = classifyResource(
        `${group.heading?.trim() ?? ""} ${label ?? ""}`,
      );
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
