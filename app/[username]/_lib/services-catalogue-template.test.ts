import { describe, expect, test } from "bun:test";

import {
  normalizeCatalogueBlogImageUrl,
  orderCataloguePracticalSections,
  selectCatalogueBlogGroups,
  selectCataloguePrimaryAction,
  selectCatalogueResources,
} from "./services-catalogue-template";

describe("Services Catalogue selectors", () => {
  test("classifies only safe active practical resources and preserves controlled identifiers", () => {
    const resources = selectCatalogueResources([
      {
        link_group_id: "10000000-0000-4000-8000-000000000001",
        heading: "Patient resources",
        rank: 1,
        dentistry_links: [
          {
            links: {
              link_id: "10000000-0000-4000-8000-000000000002",
              title: "Finance and payment guide",
              link: "example.com/finance",
              is_active: true,
              rank: 2,
              click_counter: 0,
              image_url: "/finance.webp",
              image_variant: "large-image",
              image_alt: "A payment plan consultation",
              image_decorative: false,
              is_featured: true,
            },
          },
          {
            links: {
              link_id: "10000000-0000-4000-8000-000000000003",
              title: "Meet our clinicians",
              link: "javascript:alert(1)",
              is_active: true,
              rank: 1,
              click_counter: 0,
              image_url: null,
              image_variant: "none",
              image_alt: null,
              image_decorative: true,
              is_featured: false,
            },
          },
        ],
      },
    ]);

    expect(resources).toEqual([
      expect.objectContaining({
        id: "10000000-0000-4000-8000-000000000002",
        groupId: "10000000-0000-4000-8000-000000000001",
        kind: "financing",
        href: "https://example.com/finance",
        position: 1,
      }),
    ]);
  });

  test("classifies each title before a mixed practical group heading", () => {
    const link = (id: string, title: string, rank: number) => ({
      links: {
        link_id: id,
        title,
        link: `https://example.com/${rank}`,
        is_active: true,
        rank,
        click_counter: 0,
        image_url: null,
        image_variant: "none",
        image_alt: null,
        image_decorative: true,
        is_featured: false,
      },
    });
    const resources = selectCatalogueResources([
      {
        link_group_id: "20000000-0000-4000-8000-000000000001",
        heading: "Finance, our team, and patient guides",
        rank: 1,
        dentistry_links: [
          link("20000000-0000-4000-8000-000000000002", "Payment guide", 1),
          link("20000000-0000-4000-8000-000000000003", "Meet the team", 2),
          link(
            "20000000-0000-4000-8000-000000000004",
            "Frequently asked questions",
            3,
          ),
        ],
      },
    ]);

    expect(resources.map(({ kind }) => kind)).toEqual([
      "financing",
      "team",
      "faq",
    ]);
    expect(resources.map(({ position }) => position)).toEqual([1, 2, 3]);
  });

  test("consumes the financing-order answer without inventing content", () => {
    expect(orderCataloguePracticalSections(true)).toEqual([
      "financing",
      "team",
      "faq",
    ]);
    expect(orderCataloguePracticalSections(false)).toEqual([
      "team",
      "financing",
      "faq",
    ]);
  });

  test("prefers enabled booking and safely falls back to the website", () => {
    expect(
      selectCataloguePrimaryAction({
        booking_link: "example.com/book",
        booking_link_enabled: true,
        website: "https://example.com",
      }),
    ).toEqual(
      expect.objectContaining({
        href: "https://example.com/book",
        label: "Book a consultation",
      }),
    );
    expect(
      selectCataloguePrimaryAction({
        booking_link: "javascript:alert(1)",
        booking_link_enabled: true,
        website: "example.com/services",
      }),
    ).toEqual(
      expect.objectContaining({ href: "https://example.com/services" }),
    );
  });

  test("keeps every enabled valid catalogue blog in saved group and post order", () => {
    const groups = selectCatalogueBlogGroups([
      {
        id: 71,
        name: "Treatment planning",
        enabled: true,
        blogs: Array.from({ length: 5 }, (_, index) => ({
          id: 710 + index,
          group_id: 71,
          title: `Planning guide ${index + 1}`,
          slug: `planning-guide-${index + 1}`,
          image_url: index === 0 ? "/previews/hero-image-1.webp" : null,
          enabled: true,
        })),
      },
      {
        id: 72,
        name: "Care at home",
        enabled: true,
        blogs: [
          {
            id: 720,
            group_id: 72,
            title: "Home care guide",
            slug: "home-care-guide",
            image_url: "https://cdn.example.com/home-care.webp",
            enabled: true,
          },
        ],
      },
    ]);

    expect(groups.map(({ name }) => name)).toEqual([
      "Treatment planning",
      "Care at home",
    ]);
    expect(groups.flatMap(({ blogs }) => blogs.map(({ id }) => id))).toEqual([
      710, 711, 712, 713, 714, 720,
    ]);
    expect(
      groups.flatMap(({ blogs }) => blogs.map(({ position }) => position)),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("fails closed for disabled, malformed, duplicate, and mismatched catalogue blog records", () => {
    const valid = {
      id: 801,
      group_id: 80,
      title: "Visible article",
      slug: "visible-article",
      image_url: null,
      enabled: true,
    };
    const groups = selectCatalogueBlogGroups([
      null,
      {
        id: 80,
        name: "Visible",
        enabled: true,
        blogs: [
          valid,
          { ...valid },
          { ...valid, id: 802, enabled: null },
          { ...valid, id: 803, title: " " },
          { ...valid, id: 804, slug: "invalid/slug" },
          { ...valid, id: 805, group_id: 81 },
          null,
          {} as never,
        ],
      },
      {
        id: 80,
        name: "Duplicate group",
        enabled: true,
        blogs: [{ ...valid, id: 806 }],
      },
      {
        id: 81,
        name: "Null group state",
        enabled: null,
        blogs: [{ ...valid, id: 807, group_id: 81 }],
      },
      {
        id: 82,
        name: "Malformed relation",
        enabled: true,
        blogs: {} as never,
      },
    ]);

    expect(groups).toEqual([
      {
        id: 80,
        name: "Visible",
        blogs: [
          {
            id: 801,
            title: "Visible article",
            slug: "visible-article",
            imageUrl: null,
            position: 1,
          },
        ],
      },
    ]);
  });

  test("normalizes only safe optional catalogue blog image URLs", () => {
    expect(
      normalizeCatalogueBlogImageUrl(" /previews/hero-image-1.webp "),
    ).toBe("/previews/hero-image-1.webp");
    expect(
      normalizeCatalogueBlogImageUrl("https://cdn.example.com/image.webp"),
    ).toBe("https://cdn.example.com/image.webp");
    expect(
      normalizeCatalogueBlogImageUrl("/previews/../private.webp"),
    ).toBeNull();
    expect(
      normalizeCatalogueBlogImageUrl("https://user:secret@example.com/a.webp"),
    ).toBeNull();
    expect(normalizeCatalogueBlogImageUrl("javascript:alert(1)")).toBeNull();
  });
});
