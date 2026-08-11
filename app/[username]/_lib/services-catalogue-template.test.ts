import { describe, expect, test } from "bun:test";

import {
  orderCataloguePracticalSections,
  selectCataloguePrimaryAction,
  selectCatalogueResources,
  selectCatalogueTreatments,
} from "./services-catalogue-template";

const treatment = (
  id: string,
  rank: number,
  isService: boolean,
  title = id,
) => ({
  treatment_id: id,
  rank,
  treatments: { title, description: `${title} description`, isService },
});

describe("Services Catalogue selectors", () => {
  test("uses saved featured IDs in catalogue rank order and keeps remaining categories distinct", () => {
    const result = selectCatalogueTreatments(
      { featuredTreatmentIds: ["c", "a"] },
      [
        treatment("b", 2, true),
        treatment("c", 3, false),
        treatment("a", 1, false),
        treatment("d", 4, false),
      ],
    );

    expect(result.featured.map(({ treatment_id }) => treatment_id)).toEqual([
      "a",
      "c",
    ]);
    expect(result.services.map(({ treatment_id }) => treatment_id)).toEqual([
      "b",
    ]);
    expect(result.treatments.map(({ treatment_id }) => treatment_id)).toEqual([
      "d",
    ]);
  });

  test("falls back to the first three ranked catalogue entries when answers are empty or stale", () => {
    const entries = [
      treatment("late", 4, false),
      treatment("first", 1, false),
      treatment("second", 2, true),
      treatment("third", 3, false),
    ];

    expect(
      selectCatalogueTreatments(
        { featuredTreatmentIds: ["missing"] },
        entries,
      ).featured.map(({ treatment_id }) => treatment_id),
    ).toEqual(["first", "second", "third"]);
  });

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
});
