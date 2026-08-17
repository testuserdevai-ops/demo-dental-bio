import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

describe("Direct Booking blog showcase contract", () => {
  test("seeds an uncapped enabled inventory plus disabled and invalid sentinels", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/direct-booking.sql"),
      "utf8",
    );

    for (const expected of [
      "insert into public.blog_groups",
      "insert into public.blogs",
      "1611801",
      "1611802",
      "1611901",
      "1611902",
      "1611903",
      "1611904",
      "1611905",
      "1611906",
      "Unpublished booking draft",
      "Invalid booking route",
      "Article in a disabled booking group",
      "Article in a blank booking group",
    ]) {
      expect(seed).toContain(expected);
    }
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("backs every non-null seeded blog cover with existing WebP bytes", async () => {
    for (const name of ["preview-1.webp", "preview-2.webp"]) {
      const image = await readFile(resolve(root, "public/previews", name));
      expect(image.subarray(0, 4).toString()).toBe("RIFF");
      expect(image.byteLength).toBeGreaterThan(10_000);
    }
  });

  test("ships a focused relationship and ordering verifier", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-direct-booking-blog-showcase.ts"),
      "utf8",
    );

    expect(verifier).toContain("template-direct-booking@dentalbio.local");
    expect(verifier).toContain('from("blog_groups")');
    expect(verifier).toContain('.eq("blogs.enabled", true)');
    expect(verifier).toContain('referencedTable: "blogs"');
    expect(verifier).toContain("expectedVisibleBlogs");
    expect(verifier).toContain("1_611_906");
  });
});
