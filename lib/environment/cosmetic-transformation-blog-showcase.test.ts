import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

describe("Cosmetic Transformation blog showcase contract", () => {
  test("seeds more than three eligible owner posts plus policy sentinels", async () => {
    const seed = await readFile(
      resolve(
        root,
        "supabase/seeds/template-showcases/cosmetic-transformation.sql",
      ),
      "utf8",
    );

    for (const expected of [
      "insert into public.blog_groups",
      "insert into public.blogs",
      "1641801",
      "1641802",
      "1641901",
      "1641902",
      "1641903",
      "1641904",
      "1641905",
      "1641906",
      "Disabled cosmetic article",
      "cosmetic/invalid-route",
      "Article in a disabled cosmetic group",
      "Article in a blank cosmetic group",
    ]) {
      expect(seed).toContain(expected);
    }
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("references only retained blog cover assets that exist", async () => {
    const seed = await readFile(
      resolve(
        root,
        "supabase/seeds/template-showcases/cosmetic-transformation.sql",
      ),
      "utf8",
    );
    const blogRows = seed.slice(
      seed.indexOf("(1641901,"),
      seed.indexOf("(1641991,"),
    );

    expect(blogRows.match(/\/previews\/preview-[12]\.webp/g)).toEqual([
      "/previews/preview-1.webp",
      "/previews/preview-2.webp",
    ]);
    expect(blogRows).not.toContain("/previews/preview-3.webp");
    for (const path of ["preview-1.webp", "preview-2.webp"]) {
      const image = await readFile(resolve(root, "public/previews", path));
      expect(image.subarray(0, 4).toString()).toBe("RIFF");
      expect(image.byteLength).toBeGreaterThan(1_000);
    }
  });

  test("extends the canonical verifier with ordered blog relationships", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-cosmetic-transformation-blog-showcase.ts"),
      "utf8",
    );

    for (const expected of [
      "template-cosmetic-results@dentalbio.local",
      'from("blog_groups")',
      '.eq("blogs.enabled", true)',
      'referencedTable: "blogs"',
      "expectedVisibleBlogs",
      "1_641_906",
    ]) {
      expect(verifier).toContain(expected);
    }
  });
});
