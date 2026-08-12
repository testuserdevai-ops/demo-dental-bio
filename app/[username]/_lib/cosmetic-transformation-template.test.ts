import { describe, expect, test } from "bun:test";

import {
  selectCosmeticConsultationAction,
  selectFeaturedCosmeticGalleries,
  selectFeaturedCosmeticReviews,
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

  test("preserves configured gallery and review order while dropping stale IDs", () => {
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
    ];
    const reviews = [
      {
        id: 10,
        content: "Wonderful result",
        reviewer_name: "A patient",
        stars: 5,
        platform: "Google",
        rank: 2,
      },
      {
        id: 11,
        content: "Clear and calm",
        reviewer_name: "Another patient",
        stars: 5,
        platform: "Google",
        rank: 1,
      },
    ];

    expect(
      selectFeaturedCosmeticGalleries(
        { featuredGalleryIds: ["2", "999", "1"] },
        galleries,
      ).map(({ id }) => id),
    ).toEqual([2, 1]);
    expect(
      selectFeaturedCosmeticReviews(
        { featuredReviewIds: ["10", "999", "11"] },
        reviews,
      ).map(({ id }) => id),
    ).toEqual([10, 11]);
  });
});
