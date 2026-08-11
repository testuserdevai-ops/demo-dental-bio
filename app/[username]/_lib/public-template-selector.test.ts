import { describe, expect, test } from "bun:test";

import { PROFILE_TEMPLATE_IDS } from "@/lib/profile-presentation/catalog";

import {
  AVAILABLE_PUBLIC_TEMPLATE_IDS,
  selectAvailablePublicTemplate,
} from "./public-template-selector";

describe("public profile template selection", () => {
  test("registers Basic as the available compatibility renderer", () => {
    expect(AVAILABLE_PUBLIC_TEMPLATE_IDS).toEqual(["basic"]);
    expect(selectAvailablePublicTemplate("basic")).toBe("basic");
  });

  test("fails safely to Basic while a known template renderer is unavailable", () => {
    for (const templateId of PROFILE_TEMPLATE_IDS) {
      expect(selectAvailablePublicTemplate(templateId)).toBe("basic");
    }
  });
});
