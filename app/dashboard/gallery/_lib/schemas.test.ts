import { describe, expect, it } from "bun:test";
import {
  createDentalGallerySchema,
  createGeneralGallerySchema,
  reorderDentalGalleriesSchema,
  updateDentalGallerySchema,
} from "./schemas";

const dental = {
  title: "Smile result",
  beforeImageUrl: "https://storage.test/before.webp",
  afterImageUrl: "https://storage.test/after.webp",
  beforeLabel: "Before",
  afterLabel: "After",
};

describe("gallery schemas", () => {
  it("accepts the controlled dental and general gallery fields", () => {
    expect(createDentalGallerySchema.parse(dental)).toEqual(dental);
    expect(
      createGeneralGallerySchema.parse({
        title: "Practice",
        imageUrl: "https://storage.test/practice.webp",
      }),
    ).toEqual({
      title: "Practice",
      imageUrl: "https://storage.test/practice.webp",
    });
  });

  it("rejects unsafe image URLs and submitted ownership fields", () => {
    expect(
      createDentalGallerySchema.safeParse({
        ...dental,
        beforeImageUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      updateDentalGallerySchema.safeParse({
        ...dental,
        id: 1,
        enabled: true,
        userId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });

  it("permits safe legacy asset paths only for existing gallery updates", () => {
    const legacy = {
      ...dental,
      id: 1,
      enabled: true,
      beforeImageUrl: "/previews/before.webp",
      afterImageUrl: "/previews/after.webp",
    };
    expect(updateDentalGallerySchema.safeParse(legacy).success).toBe(true);
    expect(createDentalGallerySchema.safeParse(legacy).success).toBe(false);
    expect(
      updateDentalGallerySchema.safeParse({
        ...legacy,
        beforeImageUrl: "/previews/../secret.webp",
      }).success,
    ).toBe(false);
  });

  it("requires an exact duplicate-free reorder DTO", () => {
    expect(
      reorderDentalGalleriesSchema.safeParse({ orderedIds: [1, 2] }).success,
    ).toBe(true);
    expect(
      reorderDentalGalleriesSchema.safeParse({ orderedIds: [1, 1] }).success,
    ).toBe(false);
  });
});
