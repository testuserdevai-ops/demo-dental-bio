import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();
const parents = [
  "ClinicCommerceProfileTemplate.tsx",
  "SpecialistAssessmentProfileTemplate.tsx",
  "TrustFirstFamilyProfileTemplate.tsx",
] as const;
const locationFixtures = [
  [
    "c11c0000-0000-4000-8000-000000000001",
    "c11c0000-0000-4000-8000-000000000002",
    "c11c0000-0000-4000-8000-000000000101",
    "bennett-central-exterior.webp",
  ],
  [
    "c11c0000-0000-4000-8000-000000000001",
    "c11c0000-0000-4000-8000-000000000002",
    "c11c0000-0000-4000-8000-000000000102",
    "bennett-riverside-consultation.webp",
  ],
  [
    "c11c0000-0000-4000-8000-000000000001",
    "c11c0000-0000-4000-8000-000000000002",
    "c11c0000-0000-4000-8000-000000000103",
    "bennett-north-treatment-room.webp",
  ],
  [
    "5a5e5500-0000-4000-8000-000000000001",
    "5a5e5500-0000-4000-8000-000000000002",
    "5a5e5500-0000-4000-8000-000000000101",
    "fitzrovia-consultation.webp",
  ],
  [
    "5a5e5500-0000-4000-8000-000000000001",
    "5a5e5500-0000-4000-8000-000000000002",
    "5a5e5500-0000-4000-8000-000000000103",
    "city-endodontic-rooms.webp",
  ],
  [
    "5a5e5500-0000-4000-8000-000000000001",
    "5a5e5500-0000-4000-8000-000000000002",
    "5a5e5500-0000-4000-8000-000000000105",
    "west-end-entrance.webp",
  ],
  [
    "7f570000-0000-4000-8000-000000000001",
    "7f570000-0000-4000-8000-000000000002",
    "7f570000-0000-4000-8000-000000000003",
    "willow-family-welcome.webp",
  ],
  [
    "7f570000-0000-4000-8000-000000000001",
    "7f570000-0000-4000-8000-000000000002",
    "7f570000-0000-4000-8000-000000000103",
    "willow-family-east.webp",
  ],
  [
    "7f570000-0000-4000-8000-000000000001",
    "7f570000-0000-4000-8000-000000000002",
    "7f570000-0000-4000-8000-000000000105",
    "willow-family-south-consultation.webp",
  ],
] as const;

async function source(path: string) {
  return readFile(resolve(root, path), "utf8");
}

describe("next-wave Batch C static contracts", () => {
  test("all three parents reuse complete shared locations and videos", async () => {
    for (const parent of parents) {
      const contents = await source(`app/[username]/_components/${parent}`);
      expect(contents).toContain("selectProfileVideos(profile.videoGroups)");
      expect(contents).toContain("<ProfileVideoSections");
      expect(contents).toContain("<WorkLocation");
      expect(contents).toContain("serverLocations={profile.locations}");
      expect(contents).not.toMatch(/profile\.locations\.(?:find|at)\(/);
      expect(contents).not.toMatch(/profile\.locations\s*\[\s*0\s*\]/);
      expect(contents).not.toMatch(/\.slice\(0,\s*\d+\)/);
    }
  });

  test("Clinic preserves audience ordering and strict featured-first products", async () => {
    const contents = await source(
      "app/[username]/_components/ClinicCommerceProfileTemplate.tsx",
    );
    expect(contents).toContain(
      "orderCommerceSections(answers.defaultAudience)",
    );
    expect(contents).toContain("selectProfileProducts(");
    expect(contents).toContain("answers.featuredProductId");
    expect(contents).toContain("<ProfileProductSection");
    expect(contents).not.toContain("selectCommerceProducts");
    expect(contents).not.toContain("Dentist-curated shop");
    expect(contents).not.toContain("Featured pick");
  });

  test("Specialist and Trust add strict Shop while Trust keeps practical content", async () => {
    const specialist = await source(
      "app/[username]/_components/SpecialistAssessmentProfileTemplate.tsx",
    );
    const trust = await source(
      "app/[username]/_components/TrustFirstFamilyProfileTemplate.tsx",
    );
    for (const contents of [specialist, trust]) {
      expect(contents).toContain("selectProfileProducts(profile.products)");
      expect(contents).toContain("<ProfileProductSection");
    }
    expect(trust).toContain("Practical information");
    expect(trust).toContain("Plan your visit");
    expect(trust.match(/<BookingActions profile=\{profile\}/g)).toHaveLength(2);
  });

  test("ships additive exact fixtures with tied ranks and strict sentinels", async () => {
    const seed = await source(
      "supabase/seeds/template-showcases/zz-next-wave-c.sql",
    );
    for (const value of [
      "c11c0000",
      "5a5e5500",
      "7f570000",
      "1984900::bigint",
      "1655200::bigint",
      "1637200::bigint",
      "1984104",
      "1655300::bigint",
      "1637300::bigint",
      "fixture.video_base + 4",
      "fixture.product_base + 4",
      "HTTP video sentinel",
      "credential video sentinel",
      "lookalike video sentinel",
      "HTTP product sentinel",
      "credential product sentinel",
      "malformed product sentinel",
      "image_decorative",
    ]) {
      expect(seed).toContain(value);
    }
    expect(seed).toContain("on conflict (id) do update");
    expect(seed).toContain("on conflict (location_id) do update");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
    expect(seed).not.toMatch(/\bdelete\s+from\b/i);
  });

  test("ships nine exact owner-scoped location objects as real WebP bytes", async () => {
    const seed = await source(
      "supabase/seeds/template-showcases/zz-next-wave-c.sql",
    );
    const locationSeed = seed.slice(
      seed.indexOf("insert into public.locations"),
    );
    expect(locationSeed).not.toContain("/previews/");
    expect(locationFixtures).toHaveLength(9);

    for (const [
      ownerId,
      dentistryId,
      locationId,
      fileName,
    ] of locationFixtures) {
      const namespace =
        `location-images/${ownerId}/dentistries/${dentistryId}` +
        `/locations/${locationId}/${fileName}`;
      expect(locationSeed).toContain(namespace);
      const image = await readFile(
        resolve(root, `supabase/storage/${namespace}`),
      );
      expect(image.byteLength).toBeGreaterThan(12);
      expect(image.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(image.subarray(8, 12).toString("ascii")).toBe("WEBP");
    }
  });

  test("verifier requires an isolated loopback origin and production selectors", async () => {
    const verifier = await source("scripts/verify-profile-next-wave-c.ts");
    for (const value of [
      "LOCAL_SUPABASE_WORKDIR",
      "E2E_SUPABASE_URL",
      "E2E_SUPABASE_ANON_KEY",
      'url.pathname === "/"',
      "!url.search",
      "!url.hash",
      '.from("public_profiles")',
      '.from("groups")',
      '.from("products")',
      '.from("dentistry_locations")',
      "selectProfileLocations",
      "selectProfileVideos",
      "selectProfileProducts",
      "actualVideoGroups",
      "expectedVideoGroups",
      "imagePath",
      "imageAlt",
      "imageDecorative",
      "/storage/v1/object/public/location-images/",
      "JSON.stringify(actual) === JSON.stringify(expected)",
      'for (const phase of ["initial", "reload"]',
    ]) {
      expect(verifier).toContain(value);
    }
    expect(verifier).not.toContain("54321");
    expect(verifier).not.toMatch(/https:\/\/[^"']*supabase/i);

    const e2e = await source("e2e/public-profile-next-wave-c.spec.ts");
    for (const value of [
      "data-video-group-id",
      "showcase.videoGroups",
      'name: "View map"',
      'getByRole("dialog"',
      'name: "Done"',
      "naturalWidth",
      "[data-location-image] img",
      "/storage/v1/object/public/location-images/",
    ]) {
      expect(e2e).toContain(value);
    }
  });
});
