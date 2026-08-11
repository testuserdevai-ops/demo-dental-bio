import { describe, expect, test } from "bun:test";

const componentSource = async (name: string) =>
  Bun.file(`app/[username]/_components/${name}`).text();

describe("booking, router, and services link-in-bio canvas", () => {
  test.each([
    "DirectBookingProfileTemplate.tsx",
    "LocationRouterProfileTemplate.tsx",
    "ServicesCatalogueProfileTemplate.tsx",
  ])("keeps %s inside the Basic 661px profile width", async (name) => {
    const source = await componentSource(name);
    expect(source).toContain("max-w-[661px]");
    expect(source).not.toMatch(/max-w-\[(720|780|960)px\]/);
  });

  test("keeps dashboard preview anchors on rendered Direct Booking modules", async () => {
    const source = await componentSource("DirectBookingProfileTemplate.tsx");
    for (const id of ["links", "treatments", "location", "review"]) {
      expect(source).toContain(`id=\"${id}\"`);
    }
  });

  test("keeps the Location Router's one compact selector and removes invented hours", async () => {
    const source = await componentSource("LocationRouterExperience.tsx");
    expect(source).toContain('id="location"');
    expect(source).not.toContain("Opening times");
    expect(source).not.toContain("today&apos;s opening");
  });

  test("keeps Services Catalogue actions near a compact identity card", async () => {
    const source = await componentSource(
      "ServicesCatalogueProfileTemplate.tsx",
    );
    expect(source).toContain("size-28");
    expect(source).not.toContain("min-h-64");
    expect(source).toContain('id="review"');
    expect(source).toContain('id="treatments"');
  });
});
