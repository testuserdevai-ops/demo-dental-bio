import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

const showcases = [
  {
    story: "PFP-GAL-SCG",
    template: "ServicesCatalogueProfileTemplate.tsx",
    moduleId: "services-catalogue-gallery",
    seed: "services-catalogue.sql",
    verifier: "verify-services-catalogue-gallery-showcase.ts",
    email: "template-services-catalogue@dentalbio.local",
    ids: ["1711401", "1711404", "1711501", "1711505"],
    sentinels: ["Hidden catalogue result", "Unsafe catalogue image"],
  },
  {
    story: "PFP-GAL-SPA",
    template: "SpecialistAssessmentProfileTemplate.tsx",
    moduleId: "specialist-assessment-gallery",
    seed: "specialist-assessment.sql",
    verifier: "verify-specialist-assessment-gallery-showcase.ts",
    email: "template-specialist-assessment@dentalbio.local",
    ids: ["1655401", "1655404", "1655501", "1655505"],
    sentinels: ["Hidden specialist result", "Unsafe specialist image"],
  },
  {
    story: "PFP-GAL-TFP",
    template: "TrustFirstFamilyProfileTemplate.tsx",
    moduleId: "trust-first-family-practice-gallery",
    seed: "trust-first-family-practice.sql",
    verifier: "verify-trust-first-family-gallery-showcase.ts",
    email: "template-trust-first@dentalbio.local",
    ids: ["1637401", "1637404", "1637501", "1637505"],
    sentinels: ["Hidden family result", "Unsafe family image"],
  },
] as const;

describe("second shared gallery template batch", () => {
  for (const showcase of showcases) {
    test(`${showcase.story} renders both complete gallery inventories`, async () => {
      const source = await readFile(
        resolve(root, "app/[username]/_components", showcase.template),
        "utf8",
      );

      expect(source).toContain('from "./ProfileGallerySection"');
      expect(source).toContain('from "../_lib/profile-gallery"');
      expect(source).toContain("profile.galleries");
      expect(source).toContain("profile.generalGalleries");
      expect(source).toContain(`moduleId="${showcase.moduleId}"`);
      expect(source).not.toMatch(/(?:galleries|generalGalleries)\.slice\(/);
    });

    test(`${showcase.story} seeds uncapped inventories and filtering sentinels`, async () => {
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

    test(`${showcase.story} keeps an independent verifier target`, async () => {
      const verifier = await readFile(
        resolve(root, "scripts", showcase.verifier),
        "utf8",
      );
      expect(verifier).toContain(showcase.email);
      expect(verifier).toContain("expectedCases");
      expect(verifier).toContain("expectedGeneralImages");
    });
  }
});
