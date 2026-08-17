import { describe, expect, test } from "bun:test";

import {
  createLocationRouterBookingHref,
  createLocationRouterBlogSections,
  createLocationRouterEmailHref,
  createLocationRouterPhoneHref,
  createLocationRouterState,
  getLocationRouterCopy,
  getLocationRouterLabel,
  getLocationRouterSummary,
  type LocationRouterLocation,
} from "./location-router-template";

const locations = [
  {
    location_id: "11111111-1111-4111-8111-111111111111",
    locations: {
      business_name: "Harbour Dental",
      full_address: "1 Harbour Road, Brighton BN1 1AA",
      area: "Kemptown",
      city: "Brighton",
      country: "United Kingdom",
      latitude: 50.819,
      longitude: -0.136,
      image_url: "https://storage.test/harbour.webp",
      image_alt: "Harbour Dental reception",
      image_decorative: false,
    },
  },
  {
    location_id: "22222222-2222-4222-8222-222222222222",
    locations: {
      business_name: "Northside Clinic",
      full_address: null,
      area: "Hove",
      city: "Brighton",
      country: "United Kingdom",
      latitude: null,
      longitude: null,
      image_url: null,
      image_alt: null,
      image_decorative: true,
    },
  },
] satisfies LocationRouterLocation[];

describe("location router template", () => {
  test("uses the saved template answers to choose copy and a stable default", () => {
    expect(getLocationRouterCopy({ routerKind: "provider" })).toEqual({
      eyebrow: "Choose your care team",
      selectorLabel: "Clinician location",
      introduction:
        "Select the clinic where you would like to meet the right clinician for your care.",
    });

    const state = createLocationRouterState(
      {
        routerKind: "location",
        defaultLocationId: "22222222-2222-4222-8222-222222222222",
      },
      locations,
    );

    expect(state.defaultOptionId).toBe("22222222-2222-4222-8222-222222222222");
    expect(state.recoveredDefault).toBe(false);
    expect(state.options.map(({ id, position }) => [id, position])).toEqual([
      ["11111111-1111-4111-8111-111111111111", 1],
      ["22222222-2222-4222-8222-222222222222", 2],
    ]);
  });

  test("recovers deterministically when a saved location is hidden or deleted", () => {
    const state = createLocationRouterState(
      {
        routerKind: "location",
        defaultLocationId: "33333333-3333-4333-8333-333333333333",
      },
      [locations[0], locations[0], { location_id: null, locations: null }],
    );

    expect(state.options).toHaveLength(1);
    expect(state.defaultOptionId).toBe("11111111-1111-4111-8111-111111111111");
    expect(state.recoveredDefault).toBe(true);
  });

  test("uses the shared UUID policy before deriving router positions", () => {
    const state = createLocationRouterState({}, [
      locations[1],
      { ...locations[0], location_id: "not-a-uuid" },
      locations[0],
      locations[1],
    ]);

    expect(state.options.map(({ id, position }) => [id, position])).toEqual([
      ["11111111-1111-4111-8111-111111111111", 1],
      ["22222222-2222-4222-8222-222222222222", 2],
    ]);
  });

  test("collapses an empty selector without inventing an entity", () => {
    expect(createLocationRouterState({}, [])).toEqual({
      options: [],
      defaultOptionId: null,
      recoveredDefault: false,
    });
  });

  test("creates honest labels and address fallbacks from saved location data", () => {
    expect(getLocationRouterLabel(locations[0].locations!)).toBe(
      "Harbour Dental",
    );
    expect(getLocationRouterSummary(locations[1].locations!)).toBe(
      "Hove, Brighton, United Kingdom",
    );
    expect(
      getLocationRouterSummary({
        ...locations[1].locations!,
        area: null,
        city: null,
        country: null,
      }),
    ).toBe("");
  });

  test("normalizes only safe, usable booking and contact destinations", () => {
    expect(
      createLocationRouterBookingHref({
        booking_link_enabled: true,
        booking_link: "example.com/book",
      }),
    ).toBe("https://example.com/book");
    expect(
      createLocationRouterBookingHref({
        booking_link_enabled: false,
        booking_link: "https://example.com/book",
      }),
    ).toBeNull();
    expect(
      createLocationRouterBookingHref({
        booking_link_enabled: true,
        booking_link: "javascript:alert(1)",
      }),
    ).toBeNull();
    expect(createLocationRouterPhoneHref("+44 (0)20 7946 0123")).toBe(
      "tel:+4402079460123",
    );
    expect(createLocationRouterPhoneHref("123")).toBeNull();
    expect(createLocationRouterEmailHref("hello@example.com")).toBe(
      "mailto:hello@example.com",
    );
    expect(createLocationRouterEmailHref("not-an-email")).toBeNull();
  });

  test("keeps every eligible blog in saved group and post order", () => {
    const sections = createLocationRouterBlogSections([
      {
        id: 20,
        name: " Practice notes ",
        blogs: [
          {
            id: 201,
            group_id: 20,
            title: " First article ",
            slug: "first-article",
            image_url: "/previews/preview-1.webp",
            enabled: true,
          },
          {
            id: 202,
            group_id: 20,
            title: "Second article",
            slug: "second-article",
            image_url: "https://images.example.com/second.webp",
            enabled: true,
          },
          {
            id: 203,
            group_id: 20,
            title: "Third article",
            slug: "third-article",
            image_url: null,
            enabled: true,
          },
          {
            id: 204,
            group_id: 20,
            title: "Fourth article",
            slug: "fourth-article",
            image_url: null,
            enabled: true,
          },
        ],
      },
      {
        id: 21,
        name: "Care guides",
        blogs: [
          {
            id: 205,
            group_id: 21,
            title: "Fifth article",
            slug: "fifth-article",
            image_url: null,
            enabled: true,
          },
        ],
      },
    ]);

    expect(sections.map(({ id, name }) => [id, name])).toEqual([
      [20, "Practice notes"],
      [21, "Care guides"],
    ]);
    expect(sections.flatMap(({ blogs }) => blogs.map(({ id }) => id))).toEqual([
      201, 202, 203, 204, 205,
    ]);
    expect(sections[0].blogs.map(({ position }) => position)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(sections[1].blogs[0].position).toBe(1);
  });

  test("filters unusable blog identities and routes without consuming visible positions", () => {
    const valid = {
      id: 301,
      group_id: 30,
      title: "A useful guide",
      slug: "a-useful-guide",
      image_url: "javascript:alert(1)",
      enabled: true,
    };
    const [section] = createLocationRouterBlogSections([
      {
        id: 30,
        name: "Guides",
        blogs: [
          { ...valid, id: 300, enabled: false },
          { ...valid, id: 302, title: "   " },
          { ...valid, id: 303, slug: "invalid/route" },
          { ...valid, id: 304, group_id: null },
          valid,
          { ...valid, id: 305, title: "Another guide", slug: "another-guide" },
          { ...valid, id: 301 },
        ],
      },
      {
        id: 31,
        name: "   ",
        blogs: [{ ...valid, id: 306, group_id: 31 }],
      },
      {
        id: 32,
        name: "Hidden",
        enabled: false,
        blogs: [{ ...valid, id: 307, group_id: 32 }],
      },
    ]);

    expect(section.blogs).toEqual([
      {
        id: 301,
        groupId: 30,
        title: "A useful guide",
        slug: "a-useful-guide",
        imageUrl: null,
        position: 1,
      },
      {
        id: 305,
        groupId: 30,
        title: "Another guide",
        slug: "another-guide",
        imageUrl: null,
        position: 2,
      },
    ]);
  });

  test("fails closed for nullable flags, relations, and malformed embedded records", () => {
    expect(createLocationRouterBlogSections(null)).toEqual([]);
    expect(createLocationRouterBlogSections(undefined)).toEqual([]);
    expect(
      createLocationRouterBlogSections([
        null,
        undefined,
        42 as never,
        { id: "not-a-number", name: 18, blogs: {} } as never,
        {
          id: 40,
          name: "Null flag",
          enabled: null,
          blogs: [],
        },
        {
          id: 41,
          name: "Null relation",
          enabled: true,
          blogs: null,
        },
        {
          id: 43,
          name: "Malformed relation",
          enabled: true,
          blogs: {} as never,
        },
        {
          id: 42,
          name: "Valid group",
          enabled: true,
          blogs: [
            null,
            undefined,
            {
              id: 421,
              group_id: 42,
              title: "Null enabled post",
              slug: "null-enabled-post",
              image_url: null,
              enabled: null,
            },
            {
              id: 422,
              group_id: 42,
              title: "First visible post",
              slug: "first-visible-post",
              image_url: null,
              enabled: true,
            },
            {
              id: 423,
              group_id: 42,
              title: "Second visible post",
              slug: "second-visible-post",
              image_url: null,
              enabled: true,
            },
          ],
        },
      ]),
    ).toEqual([
      {
        id: 42,
        name: "Valid group",
        blogs: [
          {
            id: 422,
            groupId: 42,
            title: "First visible post",
            slug: "first-visible-post",
            imageUrl: null,
            position: 1,
          },
          {
            id: 423,
            groupId: 42,
            title: "Second visible post",
            slug: "second-visible-post",
            imageUrl: null,
            position: 2,
          },
        ],
      },
    ]);
  });

  test("removes unsafe optional media without hiding its owner post", () => {
    const unsafeImages = [
      "https://user:secret@example.com/cover.jpg",
      "http://user@example.com/cover.jpg",
      "//example.com/cover.jpg",
      "javascript:alert(1)",
      "not a URL",
      "/previews/../private.jpg",
      "/previews/%2e%2e/private.jpg",
    ];
    const [section] = createLocationRouterBlogSections([
      {
        id: 50,
        name: "Safety guides",
        enabled: true,
        blogs: [
          ...unsafeImages.map((image_url, index) => ({
            id: 501 + index,
            group_id: 50,
            title: `Guide ${index + 1}`,
            slug: `guide-${index + 1}`,
            image_url,
            enabled: true,
          })),
          {
            id: 599,
            group_id: 50,
            title: "Safe guide",
            slug: "safe-guide",
            image_url: "https://images.example.com/cover.jpg",
            enabled: true,
          },
        ],
      },
    ]);

    expect(section.blogs).toHaveLength(unsafeImages.length + 1);
    expect(
      section.blogs
        .slice(0, unsafeImages.length)
        .every(({ imageUrl }) => imageUrl === null),
    ).toBe(true);
    expect(section.blogs.at(-1)?.imageUrl).toBe(
      "https://images.example.com/cover.jpg",
    );
  });
});
