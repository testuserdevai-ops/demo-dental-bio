import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Expert and Cosmetic reusable review integration", () => {
  test("both templates use the shared uncapped reviews component", () => {
    const expert = source(
      "app/[username]/_components/ExpertEducatorProfileTemplate.tsx",
    );
    const cosmetic = source(
      "app/[username]/_components/CosmeticTransformationProfileTemplate.tsx",
    );

    for (const template of [expert, cosmetic]) {
      expect(template).toContain(
        'import ProfileReviewsSection from "./ProfileReviewsSection"',
      );
      expect(template).toContain(
        "externalReviewPages={profile.externalReviewPages}",
      );
      expect(template).toContain("reviews={profile.reviews}");
    }
    expect(expert).toContain('templateId="expert-educator"');
    expect(cosmetic).toContain('templateId="cosmetic-transformation"');
    expect(cosmetic).not.toContain("selectFeaturedCosmeticReviews");
    expect(cosmetic).not.toContain("reviews.slice(0, 3)");
    for (const inventedHeading of [
      "Patient perspectives",
      "Reviews and independent profiles",
      "Patient experiences",
      "Feel confident in your next step",
    ]) {
      expect(expert).not.toContain(inventedHeading);
      expect(cosmetic).not.toContain(inventedHeading);
    }
  });

  test("the obsolete featured-only Cosmetic selector is removed", () => {
    const cosmeticPolicy = source(
      "app/[username]/_lib/cosmetic-transformation-template.ts",
    );
    expect(cosmeticPolicy).not.toContain("selectFeaturedCosmeticReviews");
    expect(cosmeticPolicy).not.toContain("featuredReviewIds.flatMap");
  });
});
