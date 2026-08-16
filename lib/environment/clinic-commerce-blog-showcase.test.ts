import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

describe("Clinic and Commerce blog showcase contract", () => {
  test("seeds an uncapped enabled inventory plus disabled sentinels", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/clinic-commerce.sql"),
      "utf8",
    );

    for (const expected of [
      "insert into public.blog_groups",
      "insert into public.blogs",
      "1984301",
      "1984302",
      "1984401",
      "1984402",
      "1984403",
      "1984404",
      "1984405",
      "1984406",
      "Unpublished home-care draft",
      "Article in a disabled group",
    ]) {
      expect(seed).toContain(expected);
    }
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
    expect(seed).toContain("/previews/preview-1.webp");
    expect(seed).toContain("/previews/preview-2.webp");
    expect(seed).not.toContain("/previews/preview-3.webp");
  });

  test("backs every non-null seeded blog image with real WebP bytes", async () => {
    for (const name of ["preview-1.webp", "preview-2.webp"]) {
      const image = await readFile(resolve(root, "public/previews", name));
      expect(image.subarray(0, 4).toString()).toBe("RIFF");
      expect(image.byteLength).toBeGreaterThan(10_000);
    }
  });

  test("ships a focused relationship and ordering verifier", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-clinic-commerce-blog-showcase.ts"),
      "utf8",
    );

    expect(verifier).toContain("template-clinic-commerce@dentalbio.local");
    expect(verifier).toContain('from("blog_groups")');
    expect(verifier).toContain('.eq("blogs.enabled", true)');
    expect(verifier).toContain('referencedTable: "blogs"');
    expect(verifier).toContain("expectedVisibleBlogs");
    expect(verifier).toContain("1_984_406");
  });
});
