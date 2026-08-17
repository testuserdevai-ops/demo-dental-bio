import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

const showcases = [
  {
    file: "basic.sql",
    reviewIds: ["1511601", "1511602", "1511603", "1511604"],
    sentinels: [
      "1511691",
      "1511692",
      "1511693",
      "1511694",
      "Hidden reviewer",
      "Null content sentinel",
      "Invalid score sentinel",
    ],
    externalId: "1511701",
    externalHref: "https://example.com/dentalbio-demo/reviews",
  },
  {
    file: "clinic-commerce.sql",
    reviewIds: ["1984201", "1984202", "1984203", "1984204"],
    sentinels: [
      "1984291",
      "1984292",
      "1984293",
      "1984294",
      "Hidden reviewer",
      "Null content sentinel",
      "Invalid score sentinel",
    ],
    externalId: "1984701",
    externalHref: "https://example.com/bennett-dental/reviews",
  },
] as const;

describe("Basic and Clinic review showcase contracts", () => {
  for (const showcase of showcases) {
    test(`${showcase.file} seeds an ordered uncapped inventory, sentinels, and an external destination`, async () => {
      const seed = await readFile(
        resolve(root, "supabase/seeds/template-showcases", showcase.file),
        "utf8",
      );

      expect(seed).toContain("insert into public.reviews");
      expect(seed).toContain("insert into public.external_review_pages");
      for (const value of [
        ...showcase.reviewIds,
        ...showcase.sentinels,
        showcase.externalId,
        showcase.externalHref,
      ]) {
        expect(seed).toContain(value);
      }
      expect(seed).not.toMatch(
        /(?:insert\s+into|update)\s+public\.public_profiles/i,
      );
    });
  }

  test("ships a selector-backed verifier that can target only an isolated stack", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-profile-reviews-showcase.ts"),
      "utf8",
    );

    for (const value of [
      "selectProfileReviews",
      'from("reviews")',
      'from("external_review_pages")',
      '.order("rank")',
      '.order("id")',
      "LOCAL_SUPABASE_WORKDIR",
      "E2E_SUPABASE_URL",
      "Refusing to verify a non-loopback Supabase API",
      "1_511_604",
      "1_984_204",
      "1_511_701",
      "1_984_701",
    ]) {
      expect(verifier).toContain(value);
    }
  });

  test("keeps review rendering free of template-authored owner copy", async () => {
    const [basicTemplate, component, clinicTemplate, loader] =
      await Promise.all([
        readFile(
          resolve(root, "app/[username]/_components/BasicProfileTemplate.tsx"),
          "utf8",
        ),
        readFile(
          resolve(root, "app/[username]/_components/ProfileReviewsSection.tsx"),
          "utf8",
        ),
        readFile(
          resolve(
            root,
            "app/[username]/_components/ClinicCommerceProfileTemplate.tsx",
          ),
          "utf8",
        ),
        readFile(
          resolve(root, "app/[username]/_lib/public-profile.ts"),
          "utf8",
        ),
      ]);
    const reviewSources = `${component}\n${clinicTemplate}`;

    for (const staticCopy of [
      "Patient confidence",
      "Patient reviews",
      "Source:",
      "Read all reviews",
      "Read more patient reviews",
      "More reviews",
    ]) {
      expect(reviewSources).not.toContain(staticCopy);
    }
    expect(basicTemplate).toContain("<ProfileReviewsSection");
    expect(basicTemplate).not.toContain("../components/Reviews");
    expect(clinicTemplate).toContain("<ProfileReviewsSection");
    expect(clinicTemplate).not.toContain("profile.reviews.slice");
    expect(loader).toMatch(
      /\.from\("reviews"\)[\s\S]*?\.order\("rank"\)\s*\.order\("id"\),/,
    );
  });
});
