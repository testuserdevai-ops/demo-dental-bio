import { describe, expect, test } from "bun:test";

import {
  orderCommerceSections,
  selectCommerceClinicAction,
  selectCommerceProducts,
} from "./clinic-commerce-template";

describe("Clinic and Commerce selectors", () => {
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
    expect(selected.products.map(({ id }) => id)).toEqual(["21", "20"]);
    expect(selected.products.map(({ position }) => position)).toEqual([2, 1]);
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
});
