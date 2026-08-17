import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

describe("Clinic and Commerce gallery showcase contract", () => {
  test("seeds uncapped ordered inventories with hidden and malformed sentinels", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/clinic-commerce.sql"),
      "utf8",
    );

    for (const expected of [
      "insert into public.galleries",
      "insert into public.general_galleries",
      "1984501",
      "1984502",
      "1984503",
      "1984504",
      "1984601",
      "1984602",
      "1984603",
      "1984604",
      "1984605",
      "Hidden comparison",
      "Hidden studio image",
      "javascript:alert(1)",
      "file:///private/studio.webp",
    ]) {
      expect(seed).toContain(expected);
    }
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("backs every eligible seeded gallery path with real WebP bytes", async () => {
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

  test("ships a story-specific ordering and filtering verifier", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-clinic-commerce-gallery-showcase.ts"),
      "utf8",
    );

    expect(verifier).toContain("template-clinic-commerce@dentalbio.local");
    expect(verifier).toContain('from("galleries")');
    expect(verifier).toContain('from("general_galleries")');
    expect(verifier).toContain("expectedCases");
    expect(verifier).toContain("expectedGeneralImages");
    expect(verifier).toContain("1_984_605");
  });
});
