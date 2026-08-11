import { describe, expect, it } from "bun:test";

import { resolveAppearanceChoiceAvailability } from "./choice-availability";

describe("appearance choice availability", () => {
  it("keeps free options labelled Free for every entitlement", () => {
    expect(resolveAppearanceChoiceAvailability("free", "free")).toEqual({
      label: "Free",
      locked: false,
    });
    expect(resolveAppearanceChoiceAvailability("free", "pro")).toEqual({
      label: "Free",
      locked: false,
    });
  });

  it("labels paid options Pro and changes only their locked state", () => {
    expect(resolveAppearanceChoiceAvailability("pro", "pro")).toEqual({
      label: "Pro",
      locked: false,
    });
    expect(resolveAppearanceChoiceAvailability("pro", "free")).toEqual({
      label: "Pro · Locked",
      locked: true,
    });
  });
});
