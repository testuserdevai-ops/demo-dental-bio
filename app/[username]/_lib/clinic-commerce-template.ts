import type { TrackableAction } from "@/lib/analytics/contract";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "./public-profile";

type Product = PublicProfileViewModel["products"][number];

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

  return {
    featured: featured ?? null,
    products: featured
      ? [featured, ...eligible.filter(({ id }) => id !== featured.id)]
      : eligible,
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
