import { describe, expect, test } from "bun:test";

const componentSource = async (name: string) =>
  Bun.file(`app/[username]/_components/${name}`).text();

describe("dashboard preview targets", () => {
  test("keeps Basic profile and shop targets on the rendered detail", async () => {
    const source = await Bun.file(
      "app/[username]/components/ProfileDetail.tsx",
    ).text();
    expect(source).toContain('id="profile"');
    expect(source).toContain('id="shop"');
  });

  test("keeps commerce editing targets on the rendered sections", async () => {
    const [source, shop, inventory] = await Promise.all([
      componentSource("ClinicCommerceProfileTemplate.tsx"),
      componentSource("ProfileProductSection.tsx"),
      componentSource("ProfileTreatmentServiceSections.tsx"),
    ]);
    expect(source).toContain('id="profile"');
    expect(source).toContain("<ProfileProductSection");
    expect(shop).toContain('id="shop"');
    expect(source).toContain("<ProfileTreatmentServiceSections");
    expect(inventory).toContain(
      'id={kind === "service" ? "services" : "treatments"}',
    );
  });

  test("keeps expert editing targets on the rendered sections", async () => {
    const [source, links, location] = await Promise.all([
      componentSource("ExpertEducatorProfileTemplate.tsx"),
      componentSource("ProfileLinksSection.tsx"),
      Bun.file("app/[username]/components/WorkLocation.tsx").text(),
    ]);
    expect(source).toContain('id="profile"');
    expect(source).toContain("<ProfileLinksSection");
    expect(source).toContain("<WorkLocation");
    expect(links).toContain('anchorId = "links"');
    expect(location).toContain('id="location"');
  });
});
