import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = process.cwd();

describe("local template showcase seeds", () => {
  test("seeds Basic through private sources with a controlled presentation", async () => {
    const baseSeed = await readFile(resolve(root, "supabase/seed.sql"), "utf8");
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/basic.sql"),
      "utf8",
    );
    const config = await readFile(
      resolve(root, "supabase/config.toml"),
      "utf8",
    );

    expect(seed).toContain("do $template_basic_seed$");
    expect(seed).toContain("template-basic@dentalbio.local");
    expect(seed).toContain('"username":"template-basic"');
    expect(seed).toContain('"templateId":"basic"');
    expect(seed).toContain('"themeId":"clinical-light"');
    expect(seed).toContain('"layoutVariant":"classic-stack"');
    expect(seed).toContain("from public.users source");
    expect(baseSeed).not.toContain("template_basic_seed");
    expect(config).toContain(
      'sql_paths = ["./seed.sql", "./seeds/template-showcases/*.sql"]',
    );
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("registers a deterministic profile image with real WebP bytes", async () => {
    const config = await readFile(
      resolve(root, "supabase/config.toml"),
      "utf8",
    );
    const source = await readFile(resolve(root, "public/profile.webp"));
    const seeded = await readFile(
      resolve(
        root,
        "supabase/storage/profile-pics/ba510000-0000-4000-8000-000000000002/basic-profile.webp",
      ),
    );
    const digest = (value: Buffer) =>
      createHash("sha256").update(value).digest("hex");

    expect(config).toContain("[storage.buckets.profile-pics]");
    expect(config).toContain('objects_path = "./storage/profile-pics"');
    expect(seeded.subarray(0, 4).toString()).toBe("RIFF");
    expect(digest(seeded)).toBe(digest(source));
  });

  test("verifies the stable identity, projection, every Basic module, and images", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-local-seed.ts"),
      "utf8",
    );

    for (const expected of [
      "template-basic",
      "public_profiles",
      "profile_presentation_revision",
      "dentistry_treatments",
      "videos",
      "products",
      "blog_groups",
      "galleries",
      "general_galleries",
      "reviews",
      "external_review_pages",
      "link_groups",
      "profile-pics",
      "basic-profile.webp",
    ]) {
      expect(verifier).toContain(expected);
    }
  });
});
