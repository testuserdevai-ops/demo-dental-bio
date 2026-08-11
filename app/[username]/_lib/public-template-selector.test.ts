import { describe, expect, test } from "bun:test";

import { PROFILE_TEMPLATE_IDS } from "@/lib/profile-presentation/catalog";

import {
  AVAILABLE_PUBLIC_TEMPLATE_IDS,
  selectAvailablePublicTemplate,
} from "./public-template-selector";

describe("public profile template selection", () => {
  test("registers all implemented public templates", () => {
    expect(AVAILABLE_PUBLIC_TEMPLATE_IDS).toEqual([
      "basic",
      "direct-booking",
      "location-provider-router",
      "services-catalogue",
      "cosmetic-transformation",
      "trust-first-family-practice",
    ]);
    expect(selectAvailablePublicTemplate("basic")).toBe("basic");
    expect(selectAvailablePublicTemplate("direct-booking")).toBe(
      "direct-booking",
    );
    expect(selectAvailablePublicTemplate("location-provider-router")).toBe(
      "location-provider-router",
    );
    expect(selectAvailablePublicTemplate("services-catalogue")).toBe(
      "services-catalogue",
    );
    expect(selectAvailablePublicTemplate("cosmetic-transformation")).toBe(
      "cosmetic-transformation",
    );
    expect(selectAvailablePublicTemplate("trust-first-family-practice")).toBe(
      "trust-first-family-practice",
    );
  });

  test("fails safely to Basic while a known template renderer is unavailable", () => {
    for (const templateId of PROFILE_TEMPLATE_IDS.filter(
      (id) =>
        id !== "basic" &&
        id !== "direct-booking" &&
        id !== "location-provider-router" &&
        id !== "services-catalogue" &&
        id !== "cosmetic-transformation" &&
        id !== "trust-first-family-practice",
    )) {
      expect(selectAvailablePublicTemplate(templateId)).toBe("basic");
    }
  });
});
