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
    const source = await componentSource("ClinicCommerceProfileTemplate.tsx");
    for (const id of ["profile", "shop"]) {
      expect(source).toContain(`id="${id}"`);
    }
    expect(source).toContain('id: "treatments"');
    expect(source).toContain("id={inventory.id}");
  });

  test("keeps expert editing targets on the rendered sections", async () => {
    const source = await componentSource("ExpertEducatorProfileTemplate.tsx");
    for (const id of ["profile", "links", "location"]) {
      expect(source).toContain(`id="${id}"`);
    }
  });
});
