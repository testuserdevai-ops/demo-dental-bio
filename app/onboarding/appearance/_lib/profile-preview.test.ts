import { describe, expect, it } from "bun:test";

import { resolveAppearancePreviewProfile } from "./profile-preview";

describe("resolveAppearancePreviewProfile", () => {
  it("uses the authenticated owner's first and last name", () => {
    expect(
      resolveAppearancePreviewProfile({
        title: " Dr ",
        firstName: " Alex ",
        lastName: " Morgan ",
        position: " Cosmetic dentist ",
      }),
    ).toEqual({
      initials: "AM",
      displayName: "Dr Alex Morgan",
      specialty: "Cosmetic dentist",
      usesFallback: false,
    });
  });

  it("keeps a partial real name instead of replacing the owner", () => {
    expect(
      resolveAppearancePreviewProfile({ firstName: "Amina", position: null }),
    ).toEqual({
      initials: "A",
      displayName: "Amina",
      specialty: "Dental professional",
      usesFallback: false,
    });
  });

  it("uses the illustrative profile only when both owner names are empty", () => {
    expect(
      resolveAppearancePreviewProfile({
        title: "Dr",
        firstName: " ",
        lastName: null,
        position: "Dentist",
      }),
    ).toEqual({
      initials: "AM",
      displayName: "Dr Alex Morgan",
      specialty: "General and cosmetic dentist",
      usesFallback: true,
    });
  });
});
