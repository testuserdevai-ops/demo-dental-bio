import { describe, expect, test } from "bun:test";

import {
  getExpertAudienceOrder,
  normalizeExpertHttpUrl,
  selectExpertResources,
  selectFeaturedExpertResource,
  splitExpertResources,
} from "./expert-educator-template";

const groups = [
  {
    link_group_id: "10000000-0000-4000-8000-000000000001",
    heading: "Patient guides",
    rank: 2,
    dentistry_links: [
      {
        links: {
          link_id: "10000000-0000-4000-8000-000000000011",
          title: "Understanding gum health",
          link: "https://example.com/patient",
          is_active: true,
          rank: 1,
          image_url: null,
          image_variant: "none",
          image_alt: null,
          image_decorative: true,
          is_featured: false,
        },
      },
    ],
  },
  {
    link_group_id: "10000000-0000-4000-8000-000000000002",
    heading: "Professional learning",
    rank: 1,
    dentistry_links: [
      {
        links: {
          link_id: "10000000-0000-4000-8000-000000000012",
          title: "Restorative webinar",
          link: "https://example.com/webinar",
          is_active: true,
          rank: 1,
          image_url: "https://example.com/webinar.webp",
          image_variant: "large-image",
          image_alt: "A lecture room",
          image_decorative: false,
          is_featured: true,
        },
      },
      {
        links: {
          link_id: "10000000-0000-4000-8000-000000000013",
          title: "Unsafe",
          link: "javascript:alert(1)",
          is_active: true,
          rank: 2,
          image_url: null,
          image_variant: "none",
          image_alt: null,
          image_decorative: true,
          is_featured: false,
        },
      },
    ],
  },
] as const;

describe("Expert and Educator content selection", () => {
  test("keeps active HTTP resources in stable group and link order", () => {
    expect(selectExpertResources(groups).map(({ title }) => title)).toEqual([
      "Restorative webinar",
      "Understanding gum health",
    ]);
  });

  test("honours a valid controlled featured ID and falls back safely", () => {
    const resources = selectExpertResources(groups);
    expect(
      selectFeaturedExpertResource(
        { featuredContentId: "10000000-0000-4000-8000-000000000011" },
        resources,
      )?.title,
    ).toBe("Understanding gum health");
    expect(
      selectFeaturedExpertResource(
        { featuredContentId: "10000000-0000-4000-8000-000000000099" },
        resources,
      )?.title,
    ).toBe("Restorative webinar");
  });

  test("separates patient and professional paths from controlled content", () => {
    const result = splitExpertResources(selectExpertResources(groups));
    expect(result.patients.map(({ title }) => title)).toEqual([
      "Understanding gum health",
    ]);
    expect(result.professionals.map(({ title }) => title)).toEqual([
      "Restorative webinar",
    ]);
  });

  test("puts the configured audience first and rejects unsafe URLs", () => {
    expect(
      getExpertAudienceOrder({ defaultAudience: "professionals" }),
    ).toEqual(["professionals", "patients"]);
    expect(getExpertAudienceOrder({})).toEqual(["patients", "professionals"]);
    expect(normalizeExpertHttpUrl("example.com/resource")).toBe(
      "https://example.com/resource",
    );
    expect(normalizeExpertHttpUrl("javascript:alert(1)")).toBeNull();
  });
});
