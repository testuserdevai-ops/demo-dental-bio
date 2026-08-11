import { describe, expect, it } from "bun:test";

import { PROFILE_TEMPLATE_IDS } from "@/lib/profile-presentation/catalog";

import { PROFILE_TEMPLATE_CHOICES } from "./chooser-options";
import { PROFILE_TEMPLATE_PREVIEWS } from "./template-preview-manifest";

describe("onboarding chooser catalog", () => {
  it("gives Basic and all eight templates a name, purpose, and preview state", () => {
    expect(PROFILE_TEMPLATE_CHOICES.map((choice) => choice.id)).toEqual([
      ...PROFILE_TEMPLATE_IDS,
    ]);
    expect(Object.keys(PROFILE_TEMPLATE_PREVIEWS)).toEqual([
      ...PROFILE_TEMPLATE_IDS,
    ]);
    for (const choice of PROFILE_TEMPLATE_CHOICES) {
      expect(choice.name.length).toBeGreaterThan(0);
      expect(choice.purpose.length).toBeGreaterThan(30);
      expect(choice.structure.length).toBeGreaterThan(0);
    }
  });

  it("requires meaningful alt text for screenshots and decorative alt for explicit placeholders", () => {
    for (const preview of Object.values(PROFILE_TEMPLATE_PREVIEWS)) {
      if (preview.status === "available") {
        expect(preview.alt.length).toBeGreaterThan(30);
        expect(preview.src.endsWith(".webp")).toBe(true);
      } else {
        expect(preview.alt).toBe("");
        expect(preview.reason.length).toBeGreaterThan(20);
      }
    }
  });

  it("uses the stable seeded Direct Booking capture in its selector preview", () => {
    expect(PROFILE_TEMPLATE_PREVIEWS["direct-booking"]).toEqual({
      status: "available",
      src: "/previews/template-direct-booking.webp",
      alt: "Direct Booking profile with a clinician portrait, appointment action, supporting website link, featured treatments, and a practice location image.",
    });
  });
});
