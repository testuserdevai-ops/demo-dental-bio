import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

describe("shared gallery template reuse", () => {
  for (const [template, moduleId] of [
    ["DirectBookingProfileTemplate.tsx", "direct-booking-gallery"],
    ["ExpertEducatorProfileTemplate.tsx", "expert-educator-gallery"],
    ["LocationRouterProfileTemplate.tsx", "location-provider-router-gallery"],
  ] as const) {
    test(`${template} renders both complete gallery inventories`, async () => {
      const source = await readFile(
        resolve(root, "app/[username]/_components", template),
        "utf8",
      );

      expect(source).toContain('from "./ProfileGallerySection"');
      expect(source).toContain('from "../_lib/profile-gallery"');
      expect(source).toContain("profile.galleries");
      expect(source).toContain("profile.generalGalleries");
      expect(source).toContain(`moduleId="${moduleId}"`);
      expect(source).not.toMatch(/(?:galleries|generalGalleries)\.slice\(/);
    });
  }
});
