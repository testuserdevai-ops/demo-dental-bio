import { describe, expect, test } from "bun:test";

import {
  getSpecialistReferralMessage,
  selectSpecialistActions,
  selectSpecialistBlogGroups,
  selectSpecialistContactActions,
  selectSpecialistResources,
} from "./specialist-assessment-template";

const dentistry = {
  booking_link: "https://example.com/book",
  booking_link_enabled: true,
  contact_email: "specialist@example.com",
  phone: "+44 (0)20 7123 4567",
};

const groups = [
  {
    link_group_id: "group-1",
    heading: "Patient guides",
    rank: 2,
    dentistry_links: [
      {
        links: {
          link_id: "faq-link",
          title: "Frequently asked questions",
          link: "https://example.com/faq",
          is_active: true,
          rank: 2,
          image_url: null,
          image_alt: null,
        },
      },
      {
        links: {
          link_id: "urgent-link",
          title: "Urgent and aftercare advice",
          link: "https://example.com/urgent",
          is_active: true,
          rank: 1,
          image_url: "/urgent.webp",
          image_alt: "Care team",
        },
      },
    ],
  },
  {
    link_group_id: "group-2",
    heading: "Assessment and referral",
    rank: 1,
    dentistry_links: [
      {
        links: {
          link_id: "assessment-link",
          title: "Online specialist assessment",
          link: "example.com/assessment",
          is_active: true,
          rank: 1,
          image_url: null,
          image_alt: null,
        },
      },
      {
        links: {
          link_id: "hidden-link",
          title: "Insurance guide",
          link: "https://example.com/insurance",
          is_active: false,
          rank: 2,
          image_url: null,
          image_alt: null,
        },
      },
    ],
  },
];

describe("Specialist Assessment content selection", () => {
  test("keeps every enabled, valid saved blog in owner order without a cap", () => {
    const selected = selectSpecialistBlogGroups([
      {
        id: 71,
        name: "First steps",
        enabled: true,
        blogs: Array.from({ length: 4 }, (_, index) => ({
          id: 710 + index,
          group_id: 71,
          title: `First step ${index + 1}`,
          slug: `first-step-${index + 1}`,
          image_url: index === 0 ? "/previews/preview-1.webp" : null,
          enabled: true,
        })),
      },
      {
        id: 72,
        name: "After your assessment",
        enabled: true,
        blogs: [
          {
            id: 720,
            group_id: 72,
            title: "Understanding the next step",
            slug: "understanding-the-next-step",
            image_url: "https://cdn.example.com/next-step.webp",
            enabled: true,
          },
          {
            id: 721,
            group_id: 72,
            title: "Sending helpful records",
            slug: "sending-helpful-records",
            image_url: null,
            enabled: true,
          },
        ],
      },
    ]);

    expect(selected.map(({ id }) => id)).toEqual([71, 72]);
    expect(selected.flatMap(({ blogs }) => blogs.map(({ id }) => id))).toEqual([
      710, 711, 712, 713, 720, 721,
    ]);
    expect(
      selected.flatMap(({ blogs }) => blogs.map(({ position }) => position)),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("fails closed for malformed, duplicate, disabled, unsafe, and unrelated blog records", () => {
    const selected = selectSpecialistBlogGroups([
      null,
      { id: 71, name: "Hidden", enabled: false, blogs: [] },
      { id: 72, name: "   ", enabled: true, blogs: [] },
      {
        id: 73,
        name: "Safe articles",
        enabled: true,
        blogs: [
          {
            id: 730,
            group_id: 73,
            title: "Safe article",
            slug: "safe-article",
            image_url: "/previews/preview-2.webp",
            enabled: true,
          },
          {
            id: 731,
            group_id: 73,
            title: "Unsafe media",
            slug: "unsafe-media",
            image_url: "https://owner:secret@example.com/cover.webp",
            enabled: true,
          },
          { id: 732, group_id: 73, title: " ", slug: "blank", enabled: true },
          {
            id: 733,
            group_id: 73,
            title: "Bad",
            slug: "bad/slug",
            enabled: true,
          },
          {
            id: 734,
            group_id: 99,
            title: "Wrong group",
            slug: "wrong-group",
            enabled: true,
          },
          {
            id: 730,
            group_id: 73,
            title: "Duplicate",
            slug: "duplicate",
            enabled: true,
          },
          {
            id: 735,
            group_id: 73,
            title: "Disabled",
            slug: "disabled",
            enabled: null,
          },
        ],
      },
      { id: 73, name: "Duplicate group", enabled: true, blogs: [] },
      { id: 74, name: "Malformed", enabled: true, blogs: {} as never },
    ] as never);

    expect(selected).toEqual([
      {
        id: 73,
        name: "Safe articles",
        blogs: [
          {
            id: 730,
            title: "Safe article",
            slug: "safe-article",
            imageUrl: "/previews/preview-2.webp",
            position: 1,
          },
          {
            id: 731,
            title: "Unsafe media",
            slug: "unsafe-media",
            imageUrl: null,
            position: 2,
          },
        ],
      },
    ]);
    expect(selectSpecialistBlogGroups(null)).toEqual([]);
  });

  test("classifies only active safe resources in visible order", () => {
    expect(
      selectSpecialistResources(groups).map(({ id, kind, position }) => ({
        id,
        kind,
        position,
      })),
    ).toEqual([
      { id: "assessment-link", kind: "assessment", position: 1 },
      { id: "urgent-link", kind: "emergency", position: 2 },
      { id: "faq-link", kind: "faq", position: 3 },
    ]);
  });

  test("honours the controlled primary path and preserves the other route", () => {
    const resources = selectSpecialistResources(groups);

    expect(
      selectSpecialistActions(
        { primaryPath: "assessment", referralRequired: true },
        dentistry,
        resources,
      ),
    ).toMatchObject({
      primary: {
        kind: "assessment",
        href: "https://example.com/assessment",
      },
      secondary: {
        kind: "consultation",
        href: "https://example.com/book",
      },
    });
    expect(
      selectSpecialistActions(
        { primaryPath: "consultation" },
        dentistry,
        resources,
      ).primary?.kind,
    ).toBe("consultation");
  });

  test("falls back without creating dead assessment or consultation actions", () => {
    expect(
      selectSpecialistActions(
        { primaryPath: "assessment" },
        { ...dentistry, booking_link: null },
        [],
      ),
    ).toEqual({ primary: null, secondary: null });
  });

  test("normalizes contact actions and states referral status plainly", () => {
    expect(selectSpecialistContactActions(dentistry)).toMatchObject([
      { kind: "phone", href: "tel:+4402071234567" },
      { kind: "email", href: "mailto:specialist@example.com" },
    ]);
    expect(getSpecialistReferralMessage({ referralRequired: true }).title).toBe(
      "A referral is needed",
    );
    expect(
      getSpecialistReferralMessage({ referralRequired: false }).title,
    ).toBe("You can contact the specialist directly");
  });
});
