import { describe, expect, test } from "bun:test";

import {
  orderCommerceSections,
  selectCommerceBlogGroups,
  selectCommerceClinicAction,
  selectCommerceProducts,
} from "./clinic-commerce-template";

describe("Clinic and Commerce selectors", () => {
  const blog = (
    overrides: Partial<{
      enabled: boolean | null;
      group_id: number | null;
      id: number;
      image_url: unknown;
      slug: string | null;
      title: string | null;
    }> = {},
  ) =>
    ({
      enabled: true,
      group_id: 31,
      id: 301,
      image_url: null,
      slug: "first-clinic-note",
      title: "First clinic note",
      ...overrides,
    }) as never;

  const products = [
    {
      id: "21",
      name: "Travel care kit",
      link: "https://example.com/kit",
      enabled: true,
      rank: 2,
    },
    {
      id: "20",
      name: "Sensitive care bundle",
      link: "example.com/bundle",
      enabled: true,
      rank: 1,
    },
    { id: "22", name: "Hidden", link: "https://example.com", enabled: false },
    { id: "23", name: "Unsafe", link: "javascript:alert(1)", enabled: true },
  ];

  test("honours the configured featured product and keeps a deterministic order", () => {
    const selected = selectCommerceProducts(
      { featuredProductId: "21", defaultAudience: "shop" },
      products,
    );
    expect(selected.featured?.id).toBe("21");
    expect(selected.featured?.position).toBe(1);
    expect(selected.products.map(({ id }) => id)).toEqual(["21", "20"]);
    expect(selected.products.map(({ position }) => position)).toEqual([1, 2]);
  });

  test("falls back to the first safe enabled product", () => {
    const selected = selectCommerceProducts({}, products);
    expect(selected.featured?.id).toBe("20");
    expect(selected.featured?.href).toBe("https://example.com/bundle");
  });

  test("keeps the chosen audience section first", () => {
    expect(orderCommerceSections("shop")).toEqual(["shop", "clinic"]);
    expect(orderCommerceSections("clinic")).toEqual(["clinic", "shop"]);
    expect(orderCommerceSections(undefined)).toEqual(["clinic", "shop"]);
  });

  test("uses booking before website and emits specific plus generic CTA descriptors", () => {
    const action = selectCommerceClinicAction({
      booking_link: "example.com/book",
      booking_link_enabled: true,
      website: "example.com",
    });
    expect(action).toEqual({
      href: "https://example.com/book",
      label: "Book the clinic",
      analytics: [
        { section: "profile", action: { type: "booking_click" } },
        {
          section: "profile",
          action: { type: "cta_click", ctaType: "booking" },
        },
      ],
    });
  });

  test("keeps every enabled blog in supplied rank order without a display cap", () => {
    const selected = selectCommerceBlogGroups([
      {
        id: 31,
        name: "Clinic notes",
        enabled: true,
        blogs: Array.from({ length: 5 }, (_, index) =>
          blog({
            id: 301 + index,
            slug: `clinic-note-${index + 1}`,
            title: `Clinic note ${index + 1}`,
          }),
        ),
      },
      {
        id: 32,
        name: "Home care",
        enabled: true,
        blogs: [
          blog({
            group_id: 32,
            id: 306,
            slug: "home-care-note",
            title: "Home care note",
          }),
        ],
      },
    ] as never);

    expect(selected.map(({ name }) => name)).toEqual([
      "Clinic notes",
      "Home care",
    ]);
    expect(selected.flatMap(({ blogs }) => blogs.map(({ id }) => id))).toEqual([
      301, 302, 303, 304, 305, 306,
    ]);
    expect(
      selected.flatMap(({ blogs }) => blogs.map(({ position }) => position)),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("filters disabled, blank, mismatched, duplicate, and invalid public blog records", () => {
    const valid = blog();
    const selected = selectCommerceBlogGroups([
      null,
      { id: 30, name: "Disabled", enabled: false, blogs: [valid] },
      { id: 31, name: "Clinic notes", enabled: true, blogs: null },
      {
        id: 32,
        name: "  Safe notes  ",
        enabled: true,
        blogs: [
          blog({ group_id: 32, id: 302, title: "  Safe note  " }),
          blog({ group_id: 32, id: 303, enabled: null }),
          blog({ group_id: 31, id: 304 }),
          blog({ group_id: 32, id: 305, title: "  " }),
          blog({ group_id: 32, id: 306, slug: "unsafe/slug" }),
          blog({ group_id: 32, id: 302, slug: "duplicate" }),
        ],
      },
      { id: 32, name: "Duplicate group", enabled: true, blogs: [valid] },
      { id: 33, name: " ", enabled: true, blogs: [valid] },
    ] as never);

    expect(selected).toEqual([
      {
        id: 32,
        name: "Safe notes",
        blogs: [
          {
            id: 302,
            title: "Safe note",
            slug: "first-clinic-note",
            imageUrl: null,
            position: 1,
          },
        ],
      },
    ]);
    expect(selectCommerceBlogGroups(null)).toEqual([]);
    expect(selectCommerceBlogGroups(undefined)).toEqual([]);
  });

  test("keeps safe images and drops malformed or credential-bearing images", () => {
    const imageUrls: unknown[] = [
      "/blog-images/clinic.webp",
      "https://cdn.example.com/note.webp",
      "https://user:secret@cdn.example.com/private.webp",
      "javascript:alert(1)",
      "/../private.webp",
      { src: "https://example.com/object.webp" },
    ];
    const selected = selectCommerceBlogGroups([
      {
        id: 31,
        name: "Clinic notes",
        enabled: true,
        blogs: imageUrls.map((image_url, index) =>
          blog({
            id: 301 + index,
            image_url,
            slug: `clinic-note-${index + 1}`,
          }),
        ),
      },
    ] as never);

    expect(selected[0]?.blogs.map(({ imageUrl }) => imageUrl)).toEqual([
      "/blog-images/clinic.webp",
      "https://cdn.example.com/note.webp",
      null,
      null,
      null,
      null,
    ]);
  });
});
