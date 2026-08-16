import { describe, expect, it } from "bun:test";
import {
  resolveTreatmentServiceSectionTitles,
  treatmentServiceSectionTitlesSchema,
} from "./section-titles";

describe("treatment and service section titles", () => {
  it("trims strict plain-text input", () => {
    expect(
      treatmentServiceSectionTitlesSchema.parse({
        treatmentSectionTitle: "  Smile treatments  ",
        serviceSectionTitle: "  Patient services  ",
      }),
    ).toEqual({
      treatmentSectionTitle: "Smile treatments",
      serviceSectionTitle: "Patient services",
    });
  });

  it("rejects blank, overlong, control-character, and unknown fields", () => {
    for (const input of [
      { treatmentSectionTitle: "", serviceSectionTitle: "Services" },
      {
        treatmentSectionTitle: "T".repeat(101),
        serviceSectionTitle: "Services",
      },
      {
        treatmentSectionTitle: "Treatments\nToday",
        serviceSectionTitle: "Services",
      },
      {
        treatmentSectionTitle: "Treatments",
        serviceSectionTitle: "Services",
        analyticsLabel: "private owner text",
      },
    ]) {
      expect(treatmentServiceSectionTitlesSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  it("defaults missing or legacy invalid values independently", () => {
    expect(
      resolveTreatmentServiceSectionTitles({
        treatment_section_title: " ",
        service_section_title: "Owner services",
      }),
    ).toEqual({
      treatmentSectionTitle: "Treatments",
      serviceSectionTitle: "Owner services",
    });
  });
});
