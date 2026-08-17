import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

describe("Specialist Assessment blog showcase contract", () => {
  test("seeds two groups, six eligible posts, and policy sentinels", async () => {
    const seed = await readFile(
      resolve(
        root,
        "supabase/seeds/template-showcases/specialist-assessment.sql",
      ),
      "utf8",
    );

    for (const expected of [
      "insert into public.blog_groups",
      "insert into public.blogs",
      "1655801",
      "1655802",
      "1655901",
      "1655906",
      "Disabled specialist article",
      "specialist/invalid-route",
      "Article in a disabled specialist group",
      "Article in a blank specialist group",
    ]) {
      expect(seed).toContain(expected);
    }
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("uses only existing retained WebP blog cover assets", async () => {
    const seed = await readFile(
      resolve(
        root,
        "supabase/seeds/template-showcases/specialist-assessment.sql",
      ),
      "utf8",
    );
    const blogRows = seed.slice(
      seed.indexOf("(1655901,"),
      seed.indexOf("(1655991,"),
    );
    expect(blogRows.match(/\/previews\/preview-[12]\.webp/g)).toEqual([
      "/previews/preview-1.webp",
      "/previews/preview-2.webp",
    ]);
    for (const path of ["preview-1.webp", "preview-2.webp"]) {
      const image = await readFile(resolve(root, "public/previews", path));
      expect(image.subarray(0, 4).toString()).toBe("RIFF");
      expect(image.byteLength).toBeGreaterThan(1_000);
    }
  });

  test("ships a dedicated ordered private-table verifier", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-specialist-assessment-blog-showcase.ts"),
      "utf8",
    );
    for (const expected of [
      "template-specialist-assessment@dentalbio.local",
      'from("blog_groups")',
      '.eq("blogs.enabled", true)',
      'referencedTable: "blogs"',
      "expectedVisibleBlogs",
      "1_655_906",
    ]) {
      expect(verifier).toContain(expected);
    }
  });
});
