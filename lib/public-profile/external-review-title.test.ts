import { describe, expect, it } from "bun:test";

import {
  externalReviewSectionTitleSchema,
  resolveExternalReviewSectionTitle,
} from "./external-review-title";

describe("external review section title", () => {
  it("normalizes valid owner copy and fails closed for blank or invalid values", () => {
    expect(resolveExternalReviewSectionTitle("  More owner feedback  ")).toBe(
      "More owner feedback",
    );
    expect(resolveExternalReviewSectionTitle("   ")).toBeNull();
    expect(resolveExternalReviewSectionTitle("Reviews\nelsewhere")).toBeNull();
    expect(resolveExternalReviewSectionTitle("r".repeat(101))).toBeNull();
    expect(resolveExternalReviewSectionTitle(null)).toBeNull();
  });

  it("keeps the strict dashboard payload controlled", () => {
    expect(
      externalReviewSectionTitleSchema.safeParse({
        externalReviewSectionTitle: "More reviews",
        profileId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
});
