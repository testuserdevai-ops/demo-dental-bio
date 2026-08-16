import { describe, expect, test } from "bun:test";

import {
  getExpertAudienceOrder,
  normalizeExpertHttpUrl,
  selectExpertBlogGroups,
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

  test("keeps every eligible blog in supplied group and post order with global visible positions", () => {
    const result = selectExpertBlogGroups([
      {
        id: 31,
        name: " Patient articles ",
        blogs: [
          {
            id: 301,
            title: " First article ",
            slug: "first-article",
            image_url: " /first.webp ",
            enabled: true,
          },
          {
            id: 302,
            title: "Second article",
            slug: "second-article",
            image_url: null,
            enabled: true,
          },
          {
            id: 303,
            title: "Third article",
            slug: "third-article",
            image_url: null,
            enabled: true,
          },
          {
            id: 304,
            title: "Fourth article",
            slug: "fourth-article",
            image_url: null,
            enabled: true,
          },
          {
            id: 305,
            title: "Fifth article",
            slug: "fifth-article",
            image_url: null,
            enabled: true,
          },
        ],
      },
      {
        id: 32,
        name: "Professional articles",
        blogs: [
          {
            id: 306,
            title: "Sixth article",
            slug: "sixth-article",
            image_url: null,
            enabled: true,
          },
        ],
      },
    ]);

    expect(result).toHaveLength(2);
    expect(
      result.flatMap(({ blogs }) => blogs.map(({ title }) => title)),
    ).toEqual([
      "First article",
      "Second article",
      "Third article",
      "Fourth article",
      "Fifth article",
      "Sixth article",
    ]);
    expect(
      result.flatMap(({ blogs }) => blogs.map(({ position }) => position)),
    ).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result[0]?.blogs[0]?.imageUrl).toBe("/first.webp");
  });

  test("drops disabled, blank, unsafe, and empty legacy blog records without consuming positions", () => {
    const result = selectExpertBlogGroups([
      {
        id: 40,
        name: " ",
        blogs: [
          {
            id: 400,
            title: "Hidden with its invalid group",
            slug: "hidden-group",
            image_url: null,
            enabled: true,
          },
        ],
      },
      {
        id: 41,
        name: "Articles",
        blogs: [
          {
            id: 401,
            title: "Disabled",
            slug: "disabled",
            image_url: null,
            enabled: false,
          },
          {
            id: 402,
            title: " ",
            slug: "blank-title",
            image_url: null,
            enabled: true,
          },
          {
            id: 403,
            title: "Unsafe slug",
            slug: "../unsafe",
            image_url: null,
            enabled: true,
          },
          {
            id: 404,
            title: "Eligible",
            slug: "eligible",
            image_url: null,
            enabled: true,
          },
        ],
      },
      { id: 42, name: "Empty", blogs: [] },
      {
        id: 43,
        name: "Disabled group",
        enabled: false,
        blogs: [
          {
            id: 405,
            title: "Hidden",
            slug: "hidden",
            image_url: null,
            enabled: true,
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        id: 41,
        name: "Articles",
        blogs: [
          {
            id: 404,
            title: "Eligible",
            slug: "eligible",
            imageUrl: null,
            position: 1,
          },
        ],
      },
    ]);
  });
});
