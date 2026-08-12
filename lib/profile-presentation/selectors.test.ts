import { describe, expect, test } from "bun:test";

import { PROFILE_TEMPLATE_CATALOG } from "./catalog";
import {
  selectProfilePresentationSettings,
  selectVisibleProfileModules,
} from "./selectors";

describe("profile presentation selectors", () => {
  test("registers Basic with the exact legacy top-level renderer order", () => {
    expect(PROFILE_TEMPLATE_CATALOG.basic.moduleOrder).toEqual([
      "header",
      "profile",
      "treatments",
      "services",
      "links",
      "blogs",
      "videos",
      "gallery",
      "reviews",
      "locations-contact",
      "footer",
    ]);
  });

  test("derives stable settings and filters only after template ordering", () => {
    const configuration = {
      schemaVersion: 1,
      templateId: "services-catalogue",
      themeId: "warm-care",
      layoutVariant: "classic-stack",
      answers: {},
    } as const;

    expect(selectProfilePresentationSettings(configuration)).toMatchObject({
      template: { id: "services-catalogue" },
      theme: { id: "warm-care" },
      layout: { id: "classic-stack" },
    });
    expect(
      selectVisibleProfileModules(
        configuration,
        new Set(["reviews", "primary-action", "financing"]),
      ),
    ).toEqual(["primary-action", "financing", "reviews"]);
  });
});
