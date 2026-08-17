import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";

const componentRoot = new URL("../_components/", import.meta.url);

async function source(name: string) {
  return readFile(new URL(name, componentRoot), "utf8");
}

describe("next-wave B template composition", () => {
  it.each([
    "LocationRouterProfileTemplate.tsx",
    "ServicesCatalogueProfileTemplate.tsx",
    "ExpertEducatorProfileTemplate.tsx",
  ])("renders every selected video and product in %s", async (name) => {
    const template = await source(name);

    expect(template).toContain("selectProfileVideos(profile.videoGroups)");
    expect(template).toContain("selectProfileProducts(profile.products)");
    expect(template).toContain("<ProfileVideoSections groups={videoGroups} />");
    expect(template).toContain("<ProfileProductSection products={products} />");
    expect(template).not.toMatch(/\.slice\(0,\s*\d+/);
  });

  it("keeps the router as the sole Location Router location experience", async () => {
    const template = await source("LocationRouterProfileTemplate.tsx");

    expect(template.match(/<LocationRouterExperience/g)).toHaveLength(1);
    expect(template).not.toContain("<WorkLocation");
  });

  it("keeps the Services Catalogue complete WorkLocation once", async () => {
    const template = await source("ServicesCatalogueProfileTemplate.tsx");

    expect(template.match(/<WorkLocation/g)).toHaveLength(1);
  });

  it("replaces Expert's first-only location with complete WorkLocation", async () => {
    const template = await source("ExpertEducatorProfileTemplate.tsx");

    expect(template.match(/<WorkLocation/g)).toHaveLength(1);
    expect(template).not.toContain("profile.locations.find");
    expect(template).not.toContain("<LocationMapModal");
  });
});
