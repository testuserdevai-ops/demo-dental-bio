import { describe, expect, test } from "bun:test";

import { selectProfileProducts } from "./profile-products";

describe("shared profile product selector", () => {
  test("orders every eligible product and moves only a valid featured item first", () => {
    const input = [
      {
        id: "12",
        name: " Whitening kit ",
        link: "https://shop.example.test/whitening",
        rank: "2",
        enabled: true,
      },
      {
        id: 4,
        name: "Electric brush",
        link: "https://shop.example.test/brush",
        rank: 1,
        enabled: true,
        platform: " ",
        image_url: "http://cdn.example.test/brush.webp",
        price: "not-a-price",
        currency: 3,
      },
      {
        id: 5,
        name: "Travel brush",
        link: "https://shop.example.test/travel-brush",
        rank: 1,
        enabled: true,
      },
    ];

    const selected = selectProfileProducts(input, "12");
    expect(selected.map(({ id, position }) => [id, position])).toEqual([
      ["12", 1],
      ["4", 2],
      ["5", 3],
    ]);
    expect(selected[1]).toMatchObject({
      id: "4",
      name: "Electric brush",
      link: "https://shop.example.test/brush",
      enabled: true,
    });
    expect(selected[1]?.platform).toBeUndefined();
    expect(selected[1]?.image_url).toBeUndefined();
    expect(selected[1]?.price).toBeUndefined();
    expect(selected[1]?.currency).toBeUndefined();
  });

  test("fails closed for required values while optional presentation failures degrade", () => {
    const valid = {
      id: 1,
      name: "Interdental brushes",
      link: "https://shop.example.test/brushes",
      enabled: true,
    };
    expect(
      selectProfileProducts([
        valid,
        valid,
        { ...valid, id: 2, enabled: null },
        { ...valid, id: 3, name: " " },
        { ...valid, id: 4, link: "http://shop.example.test/brushes" },
        {
          ...valid,
          id: 5,
          link: "https://user:secret@shop.example.test/brushes",
        },
        { ...valid, id: "not-an-id" },
      ]),
    ).toEqual([expect.objectContaining({ id: "1", position: 1 })]);
    expect(selectProfileProducts(null, "1")).toEqual([]);
  });
});
