import { describe, expect, it } from "bun:test";
import {
  createExternalReviewPageSchema,
  createReviewSchema,
  deleteExternalReviewPageSchema,
  reorderExternalReviewPagesSchema,
  reorderReviewsSchema,
  updateExternalReviewPageSchema,
  updateReviewSchema,
} from "./schemas";

const review = {
  reviewerName: "Patient",
  content: "Excellent care",
  stars: 5,
  imageUrl: "",
  platform: "Google",
  createdAt: "2026-08-04T09:00:00.000Z",
};

describe("review schemas", () => {
  it("accepts only a controlled review DTO", () => {
    expect(createReviewSchema.parse(review)).toEqual(review);
    expect(
      updateReviewSchema.safeParse({
        ...review,
        id: 1,
        enabled: true,
        userId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });

  it("validates rating and exact review reorder IDs", () => {
    expect(createReviewSchema.safeParse({ ...review, stars: 6 }).success).toBe(
      false,
    );
    expect(reorderReviewsSchema.safeParse({ orderedIds: [2, 2] }).success).toBe(
      false,
    );
  });

  it("accepts only controlled credential-free HTTPS external-page DTOs", () => {
    expect(
      createExternalReviewPageSchema.parse({ link: " https://reviews.test " }),
    ).toEqual({ link: "https://reviews.test/" });
    for (const link of [
      "",
      "http://reviews.test",
      "https://user:secret@reviews.test",
      "https://reviews..test",
      "https://reviews.test\\redirect",
      "javascript:alert(1)",
    ]) {
      expect(createExternalReviewPageSchema.safeParse({ link }).success).toBe(
        false,
      );
    }
    expect(
      createExternalReviewPageSchema.safeParse({
        link: "https://reviews.test",
        enabled: true,
      }).success,
    ).toBe(false);
    expect(
      updateExternalReviewPageSchema.parse({
        id: 8,
        link: "https://reviews.test/path",
        enabled: false,
      }),
    ).toEqual({
      id: 8,
      link: "https://reviews.test/path",
      enabled: false,
    });
    expect(deleteExternalReviewPageSchema.parse({ id: 8 })).toEqual({ id: 8 });
  });

  it("requires a unique positive exact-set candidate for external-page reorder", () => {
    expect(
      reorderExternalReviewPagesSchema.parse({ orderedIds: [3, 2, 1] }),
    ).toEqual({ orderedIds: [3, 2, 1] });
    expect(
      reorderExternalReviewPagesSchema.safeParse({ orderedIds: [2, 2] })
        .success,
    ).toBe(false);
    expect(
      reorderExternalReviewPagesSchema.safeParse({ orderedIds: [0] }).success,
    ).toBe(false);
  });

  it("permits a safe legacy review image only on update", () => {
    const legacy = {
      ...review,
      id: 1,
      enabled: true,
      imageUrl: "/profile.webp",
    };
    expect(updateReviewSchema.safeParse(legacy).success).toBe(true);
    expect(createReviewSchema.safeParse(legacy).success).toBe(false);
  });
});
