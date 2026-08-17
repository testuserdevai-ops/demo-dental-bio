import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

const showcases = [
  {
    story: "PFP-GAL-DBK",
    seed: "direct-booking.sql",
    verifier: "verify-direct-booking-gallery-showcase.ts",
    email: "template-direct-booking@dentalbio.local",
    ids: ["1611401", "1611404", "1611501", "1611505"],
    sentinels: ["Hidden booking result", "Unsafe booking image"],
  },
  {
    story: "PFP-GAL-EED",
    seed: "expert-educator.sql",
    verifier: "verify-expert-educator-gallery-showcase.ts",
    email: "template-expert-educator@dentalbio.local",
    ids: ["1651401", "1651404", "1651501", "1651505"],
    sentinels: ["Hidden teaching case", "Unsafe educator image"],
  },
  {
    story: "PFP-GAL-LPR",
    seed: "location-provider-router.sql",
    verifier: "verify-location-router-gallery-showcase.ts",
    email: "template-location-router@dentalbio.local",
    ids: ["1627401", "1627404", "1627501", "1627505"],
    sentinels: ["Hidden router result", "Unsafe router image"],
  },
] as const;

describe("batched profile gallery showcase contracts", () => {
  for (const showcase of showcases) {
    test(`${showcase.story} seeds ordered inventories and filtering sentinels`, async () => {
      const seed = await readFile(
        resolve(root, "supabase/seeds/template-showcases", showcase.seed),
        "utf8",
      );
      expect(seed).toContain("insert into public.galleries");
      expect(seed).toContain("insert into public.general_galleries");
      for (const expected of [...showcase.ids, ...showcase.sentinels]) {
        expect(seed).toContain(expected);
      }
      expect(seed).toContain("javascript:alert(1)");
      expect(seed).toContain("file:///private/");
      expect(seed).not.toMatch(
        /(?:insert\s+into|update)\s+public\.public_profiles/i,
      );
    });

    test(`${showcase.story} has an independent live verifier target`, async () => {
      const verifier = await readFile(
        resolve(root, "scripts", showcase.verifier),
        "utf8",
      );
      expect(verifier).toContain(showcase.email);
      expect(verifier).toContain("expectedCases");
      expect(verifier).toContain("expectedGeneralImages");
    });
  }

  test("backs all eligible gallery paths with real WebP bytes", async () => {
    for (const name of [
      "cosmetic-case-bonding-before.webp",
      "cosmetic-case-bonding-after.webp",
      "cosmetic-case-whitening-before.webp",
      "cosmetic-case-whitening-after.webp",
      "hero-image-1.webp",
      "hero-image-2.webp",
      "hero-image-3.webp",
      "primary.webp",
      "template-clinic-commerce.webp",
    ]) {
      const image = await readFile(resolve(root, "public/previews", name));
      expect(image.subarray(0, 4).toString()).toBe("RIFF");
      expect(image.byteLength).toBeGreaterThan(10_000);
    }
  });
});
