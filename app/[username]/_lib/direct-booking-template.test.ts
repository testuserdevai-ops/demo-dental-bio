import { describe, expect, test } from "bun:test";

import {
  resolveDirectBookingAction,
  selectDirectBookingActions,
  selectFeaturedTreatments,
} from "./direct-booking-template";

const dentistry = {
  booking_link: "https://booking.example.com/dr-morgan",
  booking_link_enabled: true,
  contact_email: "appointments@example.com",
  phone: "+44 (0) 20 7946 0123",
  website: "example.com",
};

const linkGroups = [
  {
    link_group_id: "00000000-0000-4000-8000-000000000010",
    dentistry_links: [
      {
        links: {
          link_id: "00000000-0000-4000-8000-000000000011",
          title: "Virtual assessment",
          link: "https://example.com/assessment",
          is_active: true,
          rank: 1,
        },
      },
    ],
  },
];

describe("Direct Booking template selection", () => {
  test("maps controlled answers onto safe existing destinations and descriptors", () => {
    expect(
      resolveDirectBookingAction("booking", dentistry, linkGroups),
    ).toMatchObject({
      label: "Book an appointment",
      href: dentistry.booking_link,
      analytics: [
        { action: { type: "booking_click" } },
        { action: { type: "cta_click", ctaType: "booking" } },
      ],
    });
    expect(
      resolveDirectBookingAction("website", dentistry, linkGroups)?.href,
    ).toBe("https://example.com/");
    expect(
      resolveDirectBookingAction("whatsapp", dentistry, linkGroups)?.href,
    ).toBe("https://wa.me/4402079460123");
    expect(
      resolveDirectBookingAction("phone", dentistry, linkGroups)?.href,
    ).toBe("tel:+4402079460123");
    expect(
      resolveDirectBookingAction("email", dentistry, linkGroups)?.href,
    ).toBe("mailto:appointments@example.com");
    expect(
      resolveDirectBookingAction("assessment", dentistry, linkGroups),
    ).toMatchObject({
      href: "https://example.com/assessment",
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

  test("never renders an unsafe or unavailable configured destination", () => {
    expect(
      resolveDirectBookingAction(
        "booking",
        { ...dentistry, booking_link: "javascript:alert(1)" },
        linkGroups,
      ),
    ).toBeNull();
    expect(
      resolveDirectBookingAction(
        "email",
        { ...dentistry, contact_email: "not-an-email" },
        linkGroups,
      ),
    ).toBeNull();
    expect(
      resolveDirectBookingAction(
        "phone",
        { ...dentistry, phone: "123" },
        linkGroups,
      ),
    ).toBeNull();
  });

  test("falls back to valid distinct actions when answers are missing or stale", () => {
    const result = selectDirectBookingActions(
      { primaryAction: "email", secondaryAction: "email" },
      { ...dentistry, contact_email: null },
      linkGroups,
    );

    expect(result.primary?.kind).toBe("booking");
    expect(result.secondary?.kind).toBe("website");
  });

  test("preserves configured featured-treatment order and drops deleted IDs", () => {
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
          title: "Invisalign",
          description: "Clear aligners",
          isService: false,
        },
      },
      {
        treatment_id: "00000000-0000-4000-8000-000000000003",
        rank: 0,
        treatments: {
          title: "Hygiene",
          description: "Routine hygiene",
          isService: true,
        },
      },
      {
        treatment_id: "00000000-0000-4000-8000-000000000004",
        rank: 0,
        treatments: {
          title: "   ",
          description: "Copy without an owner-authored title",
          isService: false,
        },
      },
    ];

    expect(
      selectFeaturedTreatments(
        {
          featuredTreatmentIds: [
            "00000000-0000-4000-8000-000000000001",
            "00000000-0000-4000-8000-000000000099",
            "00000000-0000-4000-8000-000000000002",
          ],
        },
        treatments,
      ).map(({ treatment_id }) => treatment_id),
    ).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ]);

    expect(
      selectFeaturedTreatments({}, treatments).map(
        ({ treatment_id }) => treatment_id,
      ),
    ).toEqual([
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000001",
    ]);
  });
});
