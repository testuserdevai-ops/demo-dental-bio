import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

import { PROFILE_LINK_SHOWCASES } from "./profile-links-seven-template-fixtures";

const root = process.cwd();
const templates = [
  ["DirectBookingProfileTemplate.tsx", "direct-booking"],
  ["LocationRouterProfileTemplate.tsx", "location-provider-router"],
  ["ServicesCatalogueProfileTemplate.tsx", "services-catalogue"],
  ["TrustFirstFamilyProfileTemplate.tsx", "trust-first-family-practice"],
  ["SpecialistAssessmentProfileTemplate.tsx", "specialist-assessment"],
  ["ClinicCommerceProfileTemplate.tsx", "clinic-commerce"],
  ["ExpertEducatorProfileTemplate.tsx", "expert-educator"],
] as const;

describe("seven-template saved-link parity contracts", () => {
  test("uses one shared uncapped renderer in all seven templates", async () => {
    for (const [file, moduleId] of templates) {
      const source = await readFile(
        resolve(root, "app/[username]/_components", file),
        "utf8",
      );
      expect(source).toContain("<ProfileLinksSection");
      expect(source).toContain("<ProfileTreatmentServiceSections");
      expect(source).toContain(`moduleId=\"${moduleId}\"`);
      expect(source).not.toMatch(/resources\.slice\(0,\s*[34]\)/);
      expect(source).not.toMatch(/newsletter\|updates\|community/);
    }
  });

  test("ships additive owner-source fixtures and an isolated selector verifier", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/zz-link-parity.sql"),
      "utf8",
    );
    for (const value of [
      "db010000",
      "10ca7100",
      "5e010000",
      "7f570000",
      "5a5e5500",
      "c11c0000",
      "ed0ca700",
      "link_index in 1..7",
      "link_index <> 5",
      "http://example.com/%s/unsafe",
    ]) {
      expect(seed).toContain(value);
    }
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
    expect(seed).toContain("seed_link_id uuid;");
    expect(seed).toContain("insert into public.links (\n        link_id,");
    expect(seed).toContain("values (\n        seed_link_id,");
    expect(seed).toContain("on conflict (link_id) do update");
    expect(seed).not.toMatch(/\n\s*link_id\s+uuid;/i);

    const verifier = await readFile(
      resolve(root, "scripts/verify-profile-links-seven-template.ts"),
      "utf8",
    );
    for (const value of [
      "selectProfileLinks",
      '.from("link_groups")',
      "LOCAL_SUPABASE_WORKDIR",
      "E2E_SUPABASE_URL",
      "Refusing to verify a non-loopback Supabase API",
      "JSON.stringify(actual) === JSON.stringify(expected)",
      "title: label",
      '["reload", await loadInventory()]',
    ]) {
      expect(verifier).toContain(value);
    }
  });

  test("defines every complete expected owner tuple without position gaps", () => {
    expect(PROFILE_LINK_SHOWCASES).toHaveLength(7);
    expect(
      PROFILE_LINK_SHOWCASES.map(({ expected }) => expected.length),
    ).toEqual([4, 4, 7, 6, 9, 5, 8]);
    for (const { expected, name } of PROFILE_LINK_SHOWCASES) {
      expect(
        expected.map(({ position }) => position),
        name,
      ).toEqual(
        Array.from({ length: expected.length }, (_, index) => index + 1),
      );
      expect(new Set(expected.map(({ id }) => id)).size, name).toBe(
        expected.length,
      );
      expect(
        expected.every(({ title }) => title.trim().length > 0),
        name,
      ).toBe(true);
    }
  });
});
