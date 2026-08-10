import { describe, expect, it } from "bun:test";
import {
  createProductSchema,
  reorderProductsSchema,
  updateProductSchema,
} from "./schemas";
const product = {
  name: "Care kit",
  link: "https://example.com/product",
  platform: "Demo shop",
  imageUrl: "https://example.com/image.webp",
  price: 12.99,
  currency: "GBP(£)",
  enabled: true,
};
describe("product schemas", () => {
  it("accepts controlled product values", () =>
    expect(createProductSchema.parse(product)).toEqual(product));
  it("rejects insecure links, invalid prices, and authority fields", () => {
    expect(
      createProductSchema.safeParse({ ...product, link: "http://example.com" })
        .success,
    ).toBe(false);
    expect(
      createProductSchema.safeParse({ ...product, price: -1 }).success,
    ).toBe(false);
    expect(
      createProductSchema.safeParse({ ...product, userId: crypto.randomUUID() })
        .success,
    ).toBe(false);
  });
  it("permits safe legacy images only for updates", () => {
    expect(
      updateProductSchema.safeParse({
        ...product,
        id: 1,
        imageUrl: "/previews/product.webp",
      }).success,
    ).toBe(true);
    expect(
      createProductSchema.safeParse({
        ...product,
        imageUrl: "/previews/product.webp",
      }).success,
    ).toBe(false);
  });
  it("requires duplicate-free ordering", () =>
    expect(
      reorderProductsSchema.safeParse({ orderedIds: [1, 1] }).success,
    ).toBe(false));
});
