import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();
const showcases = [
  [
    "direct-booking.sql",
    "161160",
    "161169",
    ["1611701", "1611702"],
    [
      "https://example.com/maya-patel-dentistry/reviews",
      "https://reviews.example.com/maya-patel-dentistry",
    ],
  ],
  [
    "location-provider-router.sql",
    "162760",
    "162769",
    ["1627701", "1627702"],
    [
      "https://example.com/maya-rahman/reviews",
      "https://reviews.example.com/maya-rahman",
    ],
  ],
  [
    "services-catalogue.sql",
    "171160",
    "171169",
    ["1711701", "1711702"],
    [
      "https://example.com/morgan-dental-care/reviews",
      "https://reviews.example.com/morgan-dental-care",
    ],
  ],
  [
    "specialist-assessment.sql",
    "165560",
    "165569",
    ["1655701", "1655702"],
    [
      "https://example.com/amara-shah-endodontics/reviews",
      "https://reviews.example.com/amara-shah-endodontics",
    ],
  ],
  [
    "trust-first-family-practice.sql",
    "163760",
    "163769",
    ["1637701", "1637702"],
    [
      "https://example.com/willow-family-dental/reviews",
      "https://reviews.example.com/willow-family-dental",
    ],
  ],
] as const;

describe("five-template review showcase contracts", () => {
  for (const [
    file,
    reviewPrefix,
    sentinelPrefix,
    externalIds,
    externalHrefs,
  ] of showcases) {
    test(`${file} seeds four reviews, four sentinels, and a dynamic external collection`, async () => {
      const seed = await readFile(
        resolve(root, "supabase/seeds/template-showcases", file),
        "utf8",
      );
      for (const value of [1, 2, 3, 4].flatMap((suffix) => [
        `${reviewPrefix}${suffix}`,
        `${sentinelPrefix}${suffix}`,
      ])) {
        expect(seed).toContain(value);
      }
      for (const value of [
        ...externalIds,
        ...externalHrefs,
        "Hidden reviewer",
        "Null content sentinel",
        "Invalid score sentinel",
      ]) {
        expect(seed).toContain(value);
      }
      expect(seed).not.toMatch(
        /(?:insert\s+into|update)\s+public\.public_profiles/i,
      );
    });
  }

  test("ships an isolated selector-backed batch verifier", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-profile-reviews-five-template-batch.ts"),
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
      "1_611_604",
      "1_627_604",
      "1_711_604",
      "1_655_604",
      "1_637_604",
    ]) {
      expect(verifier).toContain(value);
    }
  });

  test("uses only the shared review renderer at every integration point", async () => {
    const templates = await Promise.all(
      [
        "DirectBookingProfileTemplate.tsx",
        "LocationRouterReviews.tsx",
        "ServicesCatalogueProfileTemplate.tsx",
        "SpecialistAssessmentProfileTemplate.tsx",
        "TrustFirstFamilyProfileTemplate.tsx",
      ].map((file) =>
        readFile(resolve(root, "app/[username]/_components", file), "utf8"),
      ),
    );
    for (const template of templates) {
      expect(template).toContain("<ProfileReviewsSection");
      expect(template).not.toContain("profile.reviews.slice");
      expect(template).not.toContain("externalReviewPages.find");
    }
    expect(templates.join("\n")).not.toMatch(
      /Patient confidence|Patient reviews|Read all reviews|Read more patient reviews|Families feel listened to/,
    );
  });
});
