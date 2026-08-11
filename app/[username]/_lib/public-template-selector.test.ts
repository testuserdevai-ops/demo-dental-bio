import { describe, expect, test } from "bun:test";

import { PROFILE_TEMPLATE_IDS } from "@/lib/profile-presentation/catalog";

import {
  AVAILABLE_PUBLIC_TEMPLATE_IDS,
  selectAvailablePublicTemplate,
} from "./public-template-selector";

describe("public profile template selection", () => {
  test("registers Basic, Direct Booking, and the location router", () => {
    expect(AVAILABLE_PUBLIC_TEMPLATE_IDS).toEqual([
      "basic",
      "direct-booking",
      "location-provider-router",
    ]);
    expect(selectAvailablePublicTemplate("basic")).toBe("basic");
    expect(selectAvailablePublicTemplate("direct-booking")).toBe(
      "direct-booking",
    );
    expect(selectAvailablePublicTemplate("location-provider-router")).toBe(
      "location-provider-router",
    );
  });

  test("fails safely to Basic while a known template renderer is unavailable", () => {
    for (const templateId of PROFILE_TEMPLATE_IDS.filter(
      (id) => id !== "direct-booking" && id !== "location-provider-router",
    )) {
      expect(selectAvailablePublicTemplate(templateId)).toBe("basic");
    }
  });
});
