import { describe, expect, it } from "bun:test";
import {
  createReviewSchema,
  externalReviewPageSchema,
  reorderReviewsSchema,
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

  it("validates rating, external HTTPS URLs, and exact reorder IDs", () => {
    expect(createReviewSchema.safeParse({ ...review, stars: 6 }).success).toBe(
      false,
    );
    expect(
      externalReviewPageSchema.safeParse({ link: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(externalReviewPageSchema.parse({ link: "" })).toEqual({ link: "" });
    expect(reorderReviewsSchema.safeParse({ orderedIds: [2, 2] }).success).toBe(
      false,
    );
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
