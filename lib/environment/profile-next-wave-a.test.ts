import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();
const read = (path: string) => readFile(resolve(root, path), "utf8");
const locationFixturePaths = [
  ["db010000", 3, 1],
  ["db010000", 13, 2],
  ["db010000", 23, 3],
  ["c051e71c", 3, 1],
  ["c051e71c", 13, 2],
  ["c051e71c", 23, 3],
].map(([prefix, suffix, position]) => {
  const ownerId = `${prefix}-0000-4000-8000-000000000001`;
  const dentistryId = `${prefix}-0000-4000-8000-000000000002`;
  const locationId = `${prefix}-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
  return `supabase/storage/location-images/${ownerId}/dentistries/${dentistryId}/locations/${locationId}/owner-location-${position}.webp`;
});

describe("Batch A profile parity contracts", () => {
  test("routes all three parents through the shared strict renderers", async () => {
    const [basic, direct, cosmetic] = await Promise.all([
      read("app/[username]/_components/BasicProfileTemplate.tsx"),
      read("app/[username]/_components/DirectBookingProfileTemplate.tsx"),
      read(
        "app/[username]/_components/CosmeticTransformationProfileTemplate.tsx",
      ),
    ]);

    for (const source of [basic, direct, cosmetic]) {
      expect(source).toContain("<ProfileVideoSections");
      expect(source).toContain("<ProfileProductSection");
      expect(source).not.toMatch(/\.slice\(0,\s*\d+\)/);
    }
    for (const source of [direct, cosmetic]) {
      expect(source).toContain("<WorkLocation");
      expect(source).not.toMatch(/locations\.find/);
      expect(source).not.toContain("position={1}");
      expect(source).toContain("<ProfileTreatmentServiceSections");
    }
    expect(basic).not.toContain("<VideoGroupList");
    expect(basic).toContain('shopBehavior="navigate"');
    expect(basic).toContain("serverProducts={[]}");
  });

  test("preserves required Batch A module ordering", async () => {
    const direct = await read(
      "app/[username]/_components/DirectBookingProfileTemplate.tsx",
    );
    const cosmetic = await read(
      "app/[username]/_components/CosmeticTransformationProfileTemplate.tsx",
    );
    const ordered = (source: string, modules: string[]) => {
      const positions = modules.map((module) => source.indexOf(module));
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    };
    ordered(direct, [
      "<DirectBookingBlogSection",
      "<ProfileVideoSections",
      "<ProfileGallerySection",
      "<ProfileProductSection",
      "<WorkLocation",
      "<ProfileReviewsSection",
    ]);
    ordered(cosmetic, [
      "<CosmeticBlogSection",
      "<ProfileVideoSections",
      "<ProfileProductSection",
      "<WorkLocation",
    ]);
  });

  test("ships additive private-source sentinels and hardened isolated verification", async () => {
    const [seed, verifier] = await Promise.all([
      read("supabase/seeds/template-showcases/zz-next-wave-a.sql"),
      read("scripts/verify-profile-next-wave-a.ts"),
    ]);
    for (const marker of [
      "for item_index in 0..2 loop",
      "HTTP video sentinel",
      "credential video sentinel",
      "lookalike video sentinel",
      "disabled product sentinel",
      "malformed product sentinel",
      "item_index = 2",
      "template-next-wave-a-empty",
    ]) {
      expect(seed).toContain(marker);
    }
    expect(seed).not.toMatch(
      /(?:insert\s+into|update|delete\s+from)\s+public\.public_profiles/i,
    );
    expect(seed).not.toMatch(/delete\s+from/i);

    for (const marker of [
      'from("public_profiles")',
      "selectProfileVideos",
      "selectProfileProducts",
      "selectProfileLocations",
      "LOCAL_SUPABASE_WORKDIR",
      "E2E_SUPABASE_URL",
      "Refusing to verify a non-loopback or non-origin Supabase API",
      '["reload", await loadInventory()]',
    ]) {
      expect(verifier).toContain(marker);
    }
    expect(verifier).toContain('url.pathname === "/"');
    expect(verifier).toContain("!url.search");
    expect(verifier).toContain("!url.hash");
  });

  test("ships every exact seeded owner location object as real WebP bytes", async () => {
    const seed = await read(
      "supabase/seeds/template-showcases/zz-next-wave-a.sql",
    );
    expect(seed).toContain(
      "'/locations/' || location_uuid || '/owner-location-' || (item_index + 1) || '.webp'",
    );

    expect(locationFixturePaths).toHaveLength(6);
    for (const fixturePath of locationFixturePaths) {
      const media = await readFile(resolve(root, fixturePath));
      expect(media.byteLength).toBeGreaterThan(12);
      expect(media.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(media.subarray(8, 12).toString("ascii")).toBe("WEBP");
    }
  });
});
