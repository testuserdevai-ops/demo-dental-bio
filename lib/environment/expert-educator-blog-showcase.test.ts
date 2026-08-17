import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

describe("Expert and Educator blog showcase contract", () => {
  test("retains only seeded blog covers that exist", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/expert-educator.sql"),
      "utf8",
    );
    const blogRows = seed.slice(
      seed.indexOf("(\n      1651901,"),
      seed.indexOf("(\n      1651998,"),
    );

    expect(blogRows.match(/\/previews\/preview-[12]\.webp/g)).toEqual([
      "/previews/preview-1.webp",
      "/previews/preview-2.webp",
    ]);
    expect(blogRows).not.toContain("/previews/preview-3.webp");

    for (const name of ["preview-1.webp", "preview-2.webp"]) {
      const image = await readFile(resolve(root, "public/previews", name));
      expect(image.subarray(0, 4).toString()).toBe("RIFF");
      expect(image.byteLength).toBeGreaterThan(10_000);
    }
  });

  test("ships a focused blog-cover verifier", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-expert-educator-blog-showcase.ts"),
      "utf8",
    );

    for (const expected of [
      "template-expert-educator@dentalbio.local",
      'from("blog_groups")',
      '.eq("blogs.enabled", true)',
      'referencedTable: "blogs"',
      "expectedVisibleBlogs",
      "expectedCoverPaths",
      "1_651_904",
    ]) {
      expect(verifier).toContain(expected);
    }
  });
});
