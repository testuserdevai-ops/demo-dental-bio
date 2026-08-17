import { describe, expect, test } from "bun:test";

import {
  selectCosmeticBlogGroups,
  selectCosmeticConsultationAction,
  selectCosmeticGalleries,
  selectCosmeticGeneralGalleries,
  selectSignatureTreatment,
} from "./cosmetic-transformation-template";

const dentistry = {
  booking_link: "https://booking.example.com/smile",
  booking_link_enabled: true,
  contact_email: "smiles@example.com",
  phone: "+44 (0) 20 7946 0111",
};

const linkGroups = [
  {
    link_group_id: "00000000-0000-4000-8000-000000000010",
    dentistry_links: [
      {
        links: {
          link_id: "00000000-0000-4000-8000-000000000011",
          title: "Virtual smile consultation",
          link: "https://example.com/virtual",
          is_active: true,
          rank: 1,
        },
      },
    ],
  },
];

describe("Cosmetic Transformation content selection", () => {
  test("keeps every eligible blog in owner-defined group and post order", () => {
    const groups = selectCosmeticBlogGroups([
      {
        id: 21,
        name: "Smile planning",
        enabled: true,
        blogs: Array.from({ length: 5 }, (_, index) => ({
          id: 210 + index,
          title: `Planning article ${index + 1}`,
          slug: `planning-article-${index + 1}`,
          image_url: index === 0 ? "/previews/preview-1.webp" : null,
          enabled: true,
        })),
      },
      {
        id: 22,
        name: "Patient guides",
        enabled: true,
        blogs: [
          {
            id: 220,
            title: "Aftercare guide",
            slug: "aftercare-guide",
            image_url: "https://example.com/article.webp",
            enabled: true,
          },
        ],
      },
    ]);

    expect(groups.map(({ name }) => name)).toEqual([
      "Smile planning",
      "Patient guides",
    ]);
    expect(groups.flatMap(({ blogs }) => blogs.map(({ id }) => id))).toEqual([
      210, 211, 212, 213, 214, 220,
    ]);
    expect(
      groups.flatMap(({ blogs }) => blogs.map(({ position }) => position)),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("drops disabled, blank, malformed, and null-related blogs without crashing", () => {
    const valid = {
      id: 301,
      title: "Safe article",
      slug: "safe-article",
      image_url: "https://owner:secret@example.com/private.webp",
      enabled: true,
    };
    const groups = selectCosmeticBlogGroups([
      { id: 30, name: "Visible", enabled: true, blogs: [valid] },
      {
        id: 31,
        name: "Disabled",
        enabled: false,
        blogs: [{ ...valid, id: 302 }],
      },
      {
        id: 32,
        name: "   ",
        enabled: true,
        blogs: [{ ...valid, id: 303 }],
      },
      { id: 33, name: "Null", enabled: true, blogs: null },
      { id: 34, name: "Malformed", enabled: true, blogs: {} as never },
      {
        id: 35,
        name: "Invalid posts",
        enabled: true,
        blogs: [
          { ...valid, id: 304, enabled: null },
          { ...valid, id: 305, title: " " },
          { ...valid, id: 306, slug: "invalid/slug" },
          { ...valid, id: Number.NaN },
        ],
      },
    ]);

    expect(groups).toEqual([
      {
        id: 30,
        name: "Visible",
        blogs: [
          {
            id: 301,
            title: "Safe article",
            slug: "safe-article",
            imageUrl: null,
            position: 1,
          },
        ],
      },
    ]);
  });

  test("maps the controlled consultation mode onto a matching safe link", () => {
    expect(
      selectCosmeticConsultationAction(
        { consultationKind: "virtual" },
        dentistry,
        linkGroups,
      ),
    ).toMatchObject({
      href: "https://example.com/virtual",
      label: "Start a virtual consultation",
      analytics: [
        {
          action: {
            type: "link_click",
            linkId: "00000000-0000-4000-8000-000000000011",
          },
        },
        { action: { type: "cta_click", ctaType: "enquiry" } },
      ],
    });
  });

  test("falls back through booking, email, and phone without unsafe destinations", () => {
    expect(
      selectCosmeticConsultationAction(
        { consultationKind: "free" },
        dentistry,
        [],
      ),
    ).toMatchObject({
      href: dentistry.booking_link,
      label: "Book a free consultation",
    });
    expect(
      selectCosmeticConsultationAction(
        {},
        {
          ...dentistry,
          booking_link: "javascript:alert(1)",
          phone: null,
        },
        [],
      )?.href,
    ).toBe("mailto:smiles@example.com");
    expect(
      selectCosmeticConsultationAction(
        {},
        {
          ...dentistry,
          booking_link_enabled: false,
          contact_email: "not-an-email",
        },
        [],
      )?.href,
    ).toBe("tel:+4402079460111");
  });

  test("selects the configured signature treatment and safely falls back", () => {
    const treatments = [
      {
        treatment_id: "00000000-0000-4000-8000-000000000001",
        rank: 2,
        treatments: {
          title: "Whitening",
          description: "A brighter smile",
          isService: false,
        },
      },
      {
        treatment_id: "00000000-0000-4000-8000-000000000002",
        rank: 1,
        treatments: {
          title: "Composite bonding",
          description: "Subtle refinements",
          isService: false,
        },
      },
    ];

    expect(
      selectSignatureTreatment(
        { signatureTreatmentId: treatments[0].treatment_id },
        treatments,
      )?.treatment_id,
    ).toBe(treatments[0].treatment_id);
    expect(
      selectSignatureTreatment(
        { signatureTreatmentId: "00000000-0000-4000-8000-000000000099" },
        treatments,
      )?.treatment_id,
    ).toBe(treatments[1].treatment_id);
  });

  test("prioritizes configured cases while appending every remaining eligible case", () => {
    const galleries = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      before_image_url: `/before-${index + 1}.webp`,
      after_image_url: `/after-${index + 1}.webp`,
      title: `Case ${index + 1}`,
      before_image_label: "Before",
      after_image_label: "After",
    }));

    expect(
      selectCosmeticGalleries(
        { featuredGalleryIds: ["7", "2", "999", "7"] },
        galleries,
      ).map(({ id }) => id),
    ).toEqual([7, 2, 1, 3, 4, 5, 6, 8]);
  });

  test("drops malformed cases and general images without hiding valid ranked rows", () => {
    const galleries = [
      {
        id: 1,
        before_image_url: "/before-1.webp",
        after_image_url: "/after-1.webp",
        title: "Case one",
        before_image_label: "Before",
        after_image_label: "After",
      },
      {
        id: 2,
        before_image_url: "/before-2.webp",
        after_image_url: "/after-2.webp",
        title: "Case two",
        before_image_label: "Before",
        after_image_label: "After",
      },
      {
        id: 3,
        before_image_url: null,
        after_image_url: "/after-3.webp",
        title: "Incomplete",
        before_image_label: "Before",
        after_image_label: "After",
      },
      {
        id: 4,
        before_image_url: "javascript:alert(1)",
        after_image_url: "/after-4.webp",
        title: "Unsafe",
        before_image_label: "Before",
        after_image_label: "After",
      },
      {
        id: 5,
        before_image_url: "/before-5.webp",
        after_image_url: "/after-5.webp",
        title: "   ",
        before_image_label: "Before",
        after_image_label: "After",
      },
    ];

    expect(
      selectCosmeticGalleries(
        { featuredGalleryIds: ["2", "999", "1"] },
        galleries,
      ).map(({ id }) => id),
    ).toEqual([2, 1]);
    expect(
      selectCosmeticGeneralGalleries([
        { id: 10, title: "Hero and gallery", image_url: "/hero.webp" },
        { id: 11, title: "Second image", image_url: "/second.webp" },
        { id: 12, title: "   ", image_url: "/blank.webp" },
        { id: 13, title: "Unsafe", image_url: "javascript:alert(1)" },
        { id: 14, title: "Missing", image_url: null },
        { id: Number.NaN, title: "Bad ID", image_url: "/bad.webp" },
      ]).map(({ id }) => id),
    ).toEqual([10, 11]);
  });
});
