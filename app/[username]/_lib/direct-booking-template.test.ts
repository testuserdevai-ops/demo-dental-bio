import { describe, expect, test } from "bun:test";

import {
  resolveDirectBookingAction,
  selectDirectBookingActions,
  selectDirectBookingBlogGroups,
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
  test("keeps every eligible blog in supplied order without a display cap", () => {
    const selected = selectDirectBookingBlogGroups([
      {
        id: 41,
        name: "Appointment guides",
        enabled: true,
        blogs: Array.from({ length: 5 }, (_, index) => ({
          id: 401 + index,
          group_id: 41,
          title: `Appointment guide ${index + 1}`,
          slug: `appointment-guide-${index + 1}`,
          image_url: null,
          enabled: true,
        })),
      },
      {
        id: 42,
        name: "After your visit",
        enabled: true,
        blogs: [
          {
            id: 406,
            group_id: 42,
            title: "Aftercare guide",
            slug: "aftercare-guide",
            image_url: "/previews/preview-1.webp",
            enabled: true,
          },
        ],
      },
    ]);

    expect(selected.map(({ name }) => name)).toEqual([
      "Appointment guides",
      "After your visit",
    ]);
    expect(selected.flatMap(({ blogs }) => blogs.map(({ id }) => id))).toEqual([
      401, 402, 403, 404, 405, 406,
    ]);
    expect(
      selected.flatMap(({ blogs }) => blogs.map(({ position }) => position)),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("filters malformed blog relationships and preserves posts with safe optional media", () => {
    const selected = selectDirectBookingBlogGroups([
      null,
      { id: 40, name: "Disabled", enabled: false, blogs: [] },
      {
        id: 41,
        name: "  Appointment guides  ",
        enabled: true,
        blogs: [
          {
            id: 401,
            group_id: 41,
            title: "  First visit  ",
            slug: "first-visit",
            image_url: "https://cdn.example.com/visit.webp",
            enabled: true,
          },
          {
            id: 402,
            group_id: 41,
            title: "Unsafe image still keeps post",
            slug: "unsafe-image-keeps-post",
            image_url: "https://user:secret@cdn.example.com/private.webp",
            enabled: true,
          },
          {
            id: 403,
            group_id: 99,
            title: "Wrong group",
            slug: "wrong-group",
            image_url: null,
            enabled: true,
          },
          {
            id: 404,
            group_id: 41,
            title: "Invalid route",
            slug: "invalid/route",
            image_url: null,
            enabled: true,
          },
          {
            id: 405,
            group_id: 41,
            title: "   ",
            slug: "blank-title",
            image_url: null,
            enabled: true,
          },
          {
            id: 401,
            group_id: 41,
            title: "Duplicate",
            slug: "duplicate",
            image_url: null,
            enabled: true,
          },
        ],
      },
      { id: 41, name: "Duplicate group", enabled: true, blogs: [] },
      { id: 42, name: "  ", enabled: true, blogs: [] },
    ] as never);

    expect(selected).toEqual([
      {
        id: 41,
        name: "Appointment guides",
        blogs: [
          {
            id: 401,
            title: "First visit",
            slug: "first-visit",
            imageUrl: "https://cdn.example.com/visit.webp",
            position: 1,
          },
          {
            id: 402,
            title: "Unsafe image still keeps post",
            slug: "unsafe-image-keeps-post",
            imageUrl: null,
            position: 2,
          },
        ],
      },
    ]);
    expect(selectDirectBookingBlogGroups(null)).toEqual([]);
    expect(selectDirectBookingBlogGroups(undefined)).toEqual([]);
  });

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
});
