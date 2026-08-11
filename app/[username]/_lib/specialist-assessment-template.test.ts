import { describe, expect, test } from "bun:test";

import {
  getSpecialistReferralMessage,
  selectSpecialistActions,
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
    heading: "Start here",
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
