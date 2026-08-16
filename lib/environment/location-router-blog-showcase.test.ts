import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

describe("Location Router blog showcase contract", () => {
  test("seeds more than three eligible posts plus public-policy sentinels", async () => {
    const seed = await readFile(
      resolve(
        root,
        "supabase/seeds/template-showcases/location-provider-router.sql",
      ),
      "utf8",
    );

    for (const expected of [
      "insert into public.blog_groups",
      "insert into public.blogs",
      "1627801",
      "1627802",
      "1627901",
      "1627902",
      "1627903",
      "1627904",
      "1627905",
      "1627906",
      "javascript:alert(1)",
      "template/location-router-invalid-route",
      "Article in a disabled group",
      "Article in a blank group",
    ]) {
      expect(seed).toContain(expected);
    }
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("ships a focused relationship and ordering verifier", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-location-router-blog-showcase.ts"),
      "utf8",
    );

    expect(verifier).toContain("template-location-router@dentalbio.local");
    expect(verifier).toContain('from("blog_groups")');
    expect(verifier).toContain('.eq("blogs.enabled", true)');
    expect(verifier).toContain('referencedTable: "blogs"');
    expect(verifier).toContain("expectedVisibleBlogs");
    expect(verifier).toContain("1_627_906");
  });
});
