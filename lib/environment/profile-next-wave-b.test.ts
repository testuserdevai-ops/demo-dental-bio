import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (path: string) => readFile(resolve(root, path), "utf8");

describe("next-wave Batch B environment contract", () => {
  it("keeps all three parents on shared strict collections without caps", async () => {
    for (const parent of [
      "LocationRouterProfileTemplate.tsx",
      "ServicesCatalogueProfileTemplate.tsx",
      "ExpertEducatorProfileTemplate.tsx",
    ]) {
      const source = await read(`app/[username]/_components/${parent}`);
      expect(source).toContain("selectProfileVideos(profile.videoGroups)");
      expect(source).toContain("selectProfileProducts(profile.products)");
      expect(source).toContain("<ProfileVideoSections groups={videoGroups} />");
      expect(source).toContain("<ProfileProductSection products={products} />");
      expect(source).not.toMatch(/\.slice\(0,\s*\d+/);
      expect(source).not.toMatch(/featured (?:videos|products|shop)/i);
    }
  });

  it("keeps complete deterministic location policies without duplicates", async () => {
    const [router, services, expert] = await Promise.all([
      read("app/[username]/_components/LocationRouterProfileTemplate.tsx"),
      read("app/[username]/_components/ServicesCatalogueProfileTemplate.tsx"),
      read("app/[username]/_components/ExpertEducatorProfileTemplate.tsx"),
    ]);
    expect(router.match(/<LocationRouterExperience/g)).toHaveLength(1);
    expect(router).not.toContain("<WorkLocation");
    expect(services.match(/<WorkLocation/g)).toHaveLength(1);
    expect(expert.match(/<WorkLocation/g)).toHaveLength(1);
    expect(expert).not.toContain("profile.locations.find");
  });

  it("seeds exact uncapped inventories, tied ranks, sentinels, and three Expert locations", async () => {
    const seed = await read(
      "supabase/seeds/template-showcases/zz-next-wave-b.sql",
    );
    for (const userId of [
      "10ca7100-0000-4000-8000-000000000001",
      "5e010000-0000-4000-8000-000000000001",
      "ed0ca700-0000-4000-8000-000000000001",
    ]) {
      expect(seed).toContain(userId);
    }
    expect(seed).toContain("insert into public.groups");
    expect(seed).toContain("insert into public.videos");
    expect(seed).toContain("insert into public.products");
    expect(seed).toContain("insert into public.locations");
    expect(seed).toContain("insert into public.dentistry_locations");
    expect(seed).toContain("lookalike sentinel video");
    expect(seed).toContain("credential sentinel product");
    expect(seed).toContain("not-an-image-url");
    expect(seed).toContain("template-next-wave-b-empty");
    expect(seed).toContain("10, true");
    expect(
      seed.match(/ed0ca700-0000-4000-8000-00000000020[12]/g)?.length,
    ).toBeGreaterThanOrEqual(4);
    expect(seed).not.toMatch(
      /(?:insert|update|delete)\s+(?:into\s+|from\s+)?public\.public_profiles/i,
    );
    expect(seed.match(/location-images\/ed0ca700/g)).toHaveLength(3);
    expect(seed).toContain(
      "locations/ed0ca700-0000-4000-8000-000000000003/northbank-teaching-suite.webp",
    );
    expect(seed).toContain(
      "locations/ed0ca700-0000-4000-8000-000000000201/riverside-teaching-centre.webp",
    );
    expect(seed).toContain(
      "locations/ed0ca700-0000-4000-8000-000000000202/city-learning-rooms.webp",
    );
    for (const fixture of [
      "ed0ca700-0000-4000-8000-000000000003/northbank-teaching-suite.webp",
      "ed0ca700-0000-4000-8000-000000000201/riverside-teaching-centre.webp",
      "ed0ca700-0000-4000-8000-000000000202/city-learning-rooms.webp",
    ]) {
      const image = await readFile(
        resolve(
          root,
          "supabase/storage/location-images/ed0ca700-0000-4000-8000-000000000001/dentistries/ed0ca700-0000-4000-8000-000000000002/locations",
          fixture,
        ),
      );
      expect(image.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(image.subarray(8, 12).toString("ascii")).toBe("WEBP");
    }
  });

  it("requires an explicit isolated verifier and exact reload evidence", async () => {
    const verifier = await read("scripts/verify-profile-next-wave-b.ts");
    expect(verifier).toContain("LOCAL_SUPABASE_WORKDIR");
    expect(verifier).toContain("E2E_SUPABASE_URL");
    expect(verifier).toContain("E2E_SUPABASE_ANON_KEY");
    expect(verifier).toContain('url.protocol === "http:"');
    expect(verifier).toContain("!url.search");
    expect(verifier).toContain("!url.hash");
    expect(verifier).toContain('.from("public_profiles")');
    expect(verifier).toContain("selectProfileVideos");
    expect(verifier).toContain("selectProfileProducts");
    expect(verifier).toContain("selectProfileLocations");
    expect(verifier).toContain('["initial", "reload"]');
    expect(verifier).not.toContain("54321");
    expect(verifier).not.toContain("https://supabase");
  });

  it("keeps desktop/mobile E2E exact, interactive, accessible, and coexistent", async () => {
    const e2e = await read("e2e/public-profile-next-wave-b.spec.ts");
    expect(e2e).toContain('{ name: "desktop", width: 1280, height: 800 }');
    expect(e2e).toContain('{ name: "mobile", width: 390, height: 844 }');
    expect(e2e).toContain("data-video-position");
    expect(e2e).toContain("data-product-position");
    expect(e2e).toContain("location-router-selector");
    expect(e2e).toContain("naturalWidth");
    expect(e2e).toContain("location-images/ed0ca700");
    expect(e2e).toContain("name: /^Close /");
    expect(e2e).toContain('target", "_blank"');
    expect(e2e).toContain("document.documentElement.scrollWidth");
    expect(e2e).toContain("new AxeBuilder");
    expect(e2e).toContain("page.reload()");
    expect(e2e).toContain("/template-next-wave-b-empty");
    expect(e2e).toContain("treatment-services");
    expect(e2e).toContain("-links");
    expect(e2e).toContain("galleryModule");
    expect(e2e).toContain("reviewModule");
  });
});
