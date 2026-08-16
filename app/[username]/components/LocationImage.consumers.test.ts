import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("location image template consumers", () => {
  it("binds every existing location surface to shared per-location media", () => {
    const directConsumers = [
      "app/[username]/_components/DirectBookingProfileTemplate.tsx",
      "app/[username]/_components/CosmeticTransformationProfileTemplate.tsx",
      "app/[username]/_components/TrustFirstFamilyProfileTemplate.tsx",
      "app/[username]/_components/SpecialistAssessmentProfileTemplate.tsx",
      "app/[username]/_components/ExpertEducatorProfileTemplate.tsx",
      "app/[username]/_components/LocationRouterExperience.tsx",
    ];
    for (const path of directConsumers) {
      expect(source(path)).toContain("<LocationImage");
    }

    const sharedConsumers = [
      "app/[username]/_components/BasicProfileTemplate.tsx",
      "app/[username]/_components/ServicesCatalogueProfileTemplate.tsx",
    ];
    for (const path of sharedConsumers) {
      expect(source(path)).toContain("<WorkLocation");
    }
    expect(source("app/[username]/components/WorkLocation.tsx")).toContain(
      "<LocationImage",
    );
  });

  it("does not invent a location section for Clinic and Commerce", () => {
    const clinic = source(
      "app/[username]/_components/ClinicCommerceProfileTemplate.tsx",
    );
    expect(clinic).not.toContain("<LocationImage");
    expect(clinic).not.toContain("<WorkLocation");
  });
});
