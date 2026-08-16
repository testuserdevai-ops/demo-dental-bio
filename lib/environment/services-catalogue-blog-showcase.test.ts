import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

describe("Services Catalogue blog showcase contract", () => {
  test("seeds an uncapped enabled inventory plus disabled and invalid sentinels", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/services-catalogue.sql"),
      "utf8",
    );

    for (const expected of [
      "insert into public.blog_groups",
      "insert into public.blogs",
      "1711801",
      "1711802",
      "1711901",
      "1711902",
      "1711903",
      "1711904",
      "1711905",
      "1711906",
      "Unpublished catalogue draft",
      "Invalid catalogue route",
      "Article in a disabled catalogue group",
    ]) {
      expect(seed).toContain(expected);
    }
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("backs every non-null seeded catalogue cover with existing WebP bytes", async () => {
    for (const name of ["hero-image-1.webp", "hero-image-2.webp"]) {
      const image = await readFile(resolve(root, "public/previews", name));
      expect(image.subarray(0, 4).toString()).toBe("RIFF");
      expect(image.byteLength).toBeGreaterThan(10_000);
    }
  });

  test("ships a focused relationship and ordering verifier", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-services-catalogue-blog-showcase.ts"),
      "utf8",
    );

    expect(verifier).toContain("template-services-catalogue@dentalbio.local");
    expect(verifier).toContain('from("blog_groups")');
    expect(verifier).toContain('.eq("blogs.enabled", true)');
    expect(verifier).toContain('referencedTable: "blogs"');
    expect(verifier).toContain("expectedVisibleBlogs");
    expect(verifier).toContain("1_711_906");
  });
});
