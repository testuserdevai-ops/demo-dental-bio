import { describe, expect, test } from "bun:test";

import { PROFILE_TEMPLATE_IDS } from "@/lib/profile-presentation/catalog";

import {
  AVAILABLE_PUBLIC_TEMPLATE_IDS,
  selectAvailablePublicTemplate,
} from "./public-template-selector";

describe("public profile template selection", () => {
  test("registers Basic, Direct Booking, the location router, and Cosmetic Transformation", () => {
    expect(AVAILABLE_PUBLIC_TEMPLATE_IDS).toEqual([
      "basic",
      "direct-booking",
      "location-provider-router",
      "cosmetic-transformation",
    ]);
    expect(selectAvailablePublicTemplate("basic")).toBe("basic");
    expect(selectAvailablePublicTemplate("direct-booking")).toBe(
      "direct-booking",
    );
    expect(selectAvailablePublicTemplate("location-provider-router")).toBe(
      "location-provider-router",
    );
    expect(selectAvailablePublicTemplate("cosmetic-transformation")).toBe(
      "cosmetic-transformation",
    );
  });

  test("fails safely to Basic while a known template renderer is unavailable", () => {
    for (const templateId of PROFILE_TEMPLATE_IDS.filter(
      (id) =>
        id !== "direct-booking" &&
        id !== "location-provider-router" &&
        id !== "cosmetic-transformation",
    )) {
      expect(selectAvailablePublicTemplate(templateId)).toBe("basic");
    }
  });
});
