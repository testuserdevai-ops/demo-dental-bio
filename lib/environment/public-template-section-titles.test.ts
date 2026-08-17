import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const renderers = [
  {
    path: "app/[username]/_components/BasicProfileTemplate.tsx",
    required: ["treatment_section_title", "service_section_title"],
  },
  {
    path: "app/[username]/_components/DirectBookingProfileTemplate.tsx",
    required: ["treatment_section_title", "service_section_title"],
  },
  {
    path: "app/[username]/_components/CosmeticTransformationProfileTemplate.tsx",
    required: ["treatment_section_title", "service_section_title"],
  },
  {
    path: "app/[username]/_components/ServicesCatalogueProfileTemplate.tsx",
    required: ["treatment_section_title", "service_section_title"],
  },
  {
    path: "app/[username]/_components/TrustFirstFamilyProfileTemplate.tsx",
    required: ["treatment_section_title", "service_section_title"],
  },
  {
    path: "app/[username]/_components/SpecialistAssessmentProfileTemplate.tsx",
    required: ["treatment_section_title", "service_section_title"],
  },
  {
    path: "app/[username]/_components/ClinicCommerceProfileTemplate.tsx",
    required: ["treatment_section_title", "service_section_title"],
  },
  {
    path: "app/[username]/_components/LocationRouterProfileTemplate.tsx",
    required: ["treatment_section_title", "service_section_title"],
  },
  {
    path: "app/[username]/_components/ExpertEducatorProfileTemplate.tsx",
    required: ["treatment_section_title", "service_section_title"],
  },
] as const;

describe("public template treatment and service heading source guards", () => {
  for (const renderer of renderers) {
    test(`${renderer.path} consumes its own required owner titles`, async () => {
      const source = await readFile(resolve(root, renderer.path), "utf8");
      for (const token of renderer.required) expect(source).toContain(token);
      expect(source).not.toContain("Featured treatments");
      expect(source).not.toContain("Support services");
      expect(source).not.toContain("Explore treatment options");
      expect(source).not.toContain("Featured family services");
      expect(source).not.toContain("Specialist treatments");
      expect(source).not.toContain("Visit the clinic");
      expect(source).not.toContain("Additional treatment options");
      expect(source).not.toContain("Signature treatment");
      expect(source).not.toContain("Featured services");
      expect(source).not.toMatch(
        /\$\{[^}]*treatment_section_title[^}]*\}\s*\/\s*\$\{[^}]*service_section_title/,
      );
    });
  }

  test("the eight parity templates delegate to the shared uncapped renderer", async () => {
    const sources = await Promise.all(
      renderers
        .filter(({ path }) => !/Basic/.test(path))
        .map(({ path }) => readFile(resolve(root, path), "utf8")),
    );
    for (const source of sources) {
      expect(source).toContain("<ProfileTreatmentServiceSections");
      expect(source).toContain("selectProfileTreatmentServices");
    }
    expect(sources.join("\n")).not.toMatch(
      /selectFeaturedTreatments|selectSignatureTreatment|selectTrustFirstTreatments/,
    );
  });

  test("removed featured and capped inventory selectors cannot return", async () => {
    const sources = await Promise.all(
      [
        "app/[username]/_lib/direct-booking-template.ts",
        "app/[username]/_lib/cosmetic-transformation-template.ts",
        "app/[username]/_lib/trust-first-template.ts",
        "app/[username]/_lib/services-catalogue-template.ts",
        "app/[username]/_components/ServicesCatalogueProfileTemplate.tsx",
      ].map((path) => readFile(resolve(root, path), "utf8")),
    );
    expect(sources.join("\n")).not.toMatch(
      /selectFeaturedTreatments|selectSignatureTreatment|selectTrustFirstTreatments|selectCatalogueTreatments|data-featured-treatment|Featured care|Browse by need/,
    );
  });
});
