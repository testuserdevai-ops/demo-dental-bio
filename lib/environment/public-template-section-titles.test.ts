import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

describe("public template treatment and service headings", () => {
  test("all existing inventory headings consume owner-defined section titles", async () => {
    const files = await Promise.all(
      [
        "app/[username]/_components/BasicProfileTemplate.tsx",
        "app/[username]/_components/DirectBookingProfileTemplate.tsx",
        "app/[username]/_components/CosmeticTransformationProfileTemplate.tsx",
        "app/[username]/_components/ServicesCatalogueProfileTemplate.tsx",
        "app/[username]/_components/TrustFirstFamilyProfileTemplate.tsx",
        "app/[username]/_components/SpecialistAssessmentProfileTemplate.tsx",
        "app/[username]/_components/ClinicCommerceProfileTemplate.tsx",
        "app/[username]/components/Treatments.tsx",
        "app/[username]/components/Services.tsx",
      ].map((path) => readFile(resolve(root, path), "utf8")),
    );
    const source = files.join("\n");

    expect(source).toContain("treatment_section_title");
    expect(source).toContain("service_section_title");
    for (const hardCodedPrimaryHeading of [
      "Featured treatments",
      "Support services",
      "Explore treatment options",
      "Featured family services",
      "Specialist treatments",
      "Visit the clinic",
    ]) {
      expect(source).not.toContain(hardCodedPrimaryHeading);
    }
  });
});
