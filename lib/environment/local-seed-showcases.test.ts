import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

import { usernameSchema } from "@/lib/auth/schemas";

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

  test("seeds Direct Booking through private sources with ordered answers", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/direct-booking.sql"),
      "utf8",
    );

    expect(seed).toContain("do $template_direct_booking_seed$");
    expect(seed).toContain("template-direct-booking@dentalbio.local");
    expect(seed).toContain('"username":"template-direct-booking"');
    expect(seed).toContain("'templateId', 'direct-booking'");
    expect(seed).toContain("'themeId', 'modern-specialist'");
    expect(seed).toContain("'primaryAction', 'booking'");
    expect(seed).toContain("'secondaryAction', 'website'");
    expect(seed).toContain("'featuredTreatmentIds'");
    expect(seed).toContain("from public.users source");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("registers a dedicated Direct Booking profile image with real WebP bytes", async () => {
    const image = await readFile(
      resolve(
        root,
        "supabase/storage/profile-pics/db010000-0000-4000-8000-000000000002/direct-booking-profile.webp",
      ),
    );

    expect(image.subarray(0, 4).toString()).toBe("RIFF");
    expect(image.byteLength).toBeGreaterThan(1_000);
  });

  test("ships the real responsive Direct Booking selector capture", async () => {
    const preview = await readFile(
      resolve(root, "public/previews/template-direct-booking.webp"),
    );

    expect(preview.subarray(0, 4).toString()).toBe("RIFF");
    expect(preview.byteLength).toBeGreaterThan(10_000);
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

  test("verifies the Direct Booking showcase modules and images", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-local-seed.ts"),
      "utf8",
    );

    for (const expected of [
      "template-direct-booking",
      "Direct Booking public projection",
      "direct-booking",
      "modern-specialist",
      "featuredTreatmentIds",
      "dentistry_treatments",
      "general_galleries",
      "reviews",
      "external_review_pages",
      "profile-pics",
      "direct-booking-profile.webp",
    ]) {
      expect(verifier).toContain(expected);
    }
  });
  test("seeds the location router through private sources with mapped location IDs", async () => {
    const seed = await readFile(
      resolve(
        root,
        "supabase/seeds/template-showcases/location-provider-router.sql",
      ),
      "utf8",
    );

    expect(seed).toContain("do $template_location_router_seed$");
    expect(seed).toContain("template-location-router@dentalbio.local");
    expect(seed).toContain('"username":"template-location-router"');
    expect(seed).toContain('"templateId":"location-provider-router"');
    expect(seed).toContain('"themeId":"warm-care"');
    expect(seed).toContain('"routerKind":"location"');
    expect(seed).toContain(
      '"defaultLocationId":"10ca7100-0000-4000-8000-000000000101"',
    );
    expect(
      seed.match(/10ca7100-0000-4000-8000-00000000010[1-3]/g)?.length,
    ).toBeGreaterThan(6);
    expect(seed).toContain("insert into public.general_galleries");
    expect(seed).toContain("insert into public.reviews");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("verifies the location router projection, relationships, and profile image", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-local-seed.ts"),
      "utf8",
    );
    const source = await readFile(
      resolve(root, "public/previews/hero-image-3.webp"),
    );
    const seeded = await readFile(
      resolve(
        root,
        "supabase/storage/profile-pics/10ca7100-0000-4000-8000-000000000002/location-router-profile.webp",
      ),
    );

    for (const expected of [
      "verifyLocationRouterShowcase",
      "template-location-router",
      "location-provider-router",
      "dentistry_locations",
      "general_galleries",
      "reviews",
      "location-router-profile.webp",
    ]) {
      expect(verifier).toContain(expected);
    }
    expect(seeded.subarray(0, 4).toString()).toBe("RIFF");
    expect(createHash("sha256").update(seeded).digest("hex")).toBe(
      createHash("sha256").update(source).digest("hex"),
    );
  });

  test("keeps the canonical location router route inside the username contract", () => {
    const username = "template-location-router";

    expect(username.length).toBeLessThanOrEqual(30);
    expect(usernameSchema.parse(username)).toBe(username);
  });

  test("ships the real responsive Location Router selector capture", async () => {
    const preview = await readFile(
      resolve(root, "public/previews/template-location-router.webp"),
    );

    expect(preview.subarray(0, 4).toString()).toBe("RIFF");
    expect(preview.byteLength).toBeGreaterThan(10_000);
  });

  test("seeds Cosmetic Transformation through private sources with controlled proof selections", async () => {
    const seed = await readFile(
      resolve(
        root,
        "supabase/seeds/template-showcases/cosmetic-transformation.sql",
      ),
      "utf8",
    );

    expect(seed).toContain("do $template_cosmetic_transformation_seed$");
    expect(seed).toContain("template-cosmetic-results@dentalbio.local");
    expect(seed).toContain('"username":"template-cosmetic-results"');
    expect(seed).toContain("'templateId', 'cosmetic-transformation'");
    expect(seed).toContain("'themeId', 'premium-contrast'");
    expect(seed).toContain("'layoutVariant', 'hero-overlap'");
    expect(seed).toContain("'signatureTreatmentId'");
    expect(seed).toContain("'consultationKind', 'free'");
    expect(seed).toContain("'featuredGalleryIds'");
    expect(seed).toContain("'featuredReviewIds'");
    expect(seed).toContain("Fictional demo case");
    expect(seed).toContain("Before — fictional demo");
    expect(seed).toContain("After — fictional demo");
    expect(seed).toContain("from public.users source");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("keeps the canonical cosmetic showcase inside the username contract", () => {
    const username = "template-cosmetic-results";

    expect(username.length).toBeLessThanOrEqual(30);
    expect(usernameSchema.parse(username)).toBe(username);
  });

  test("ships real fictional demo case and profile-image WebP bytes", async () => {
    const paths = [
      "public/previews/cosmetic-case-bonding-before.webp",
      "public/previews/cosmetic-case-bonding-after.webp",
      "public/previews/cosmetic-case-whitening-before.webp",
      "public/previews/cosmetic-case-whitening-after.webp",
      "supabase/storage/profile-pics/c051e71c-0000-4000-8000-000000000002/cosmetic-results-profile.webp",
    ];

    for (const path of paths) {
      const image = await readFile(resolve(root, path));
      expect(image.subarray(0, 4).toString()).toBe("RIFF");
      expect(image.byteLength).toBeGreaterThan(5_000);
    }
  });

  test("verifies every Cosmetic Transformation relationship and image", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-local-seed.ts"),
      "utf8",
    );

    for (const expected of [
      "verifyCosmeticResultsShowcase",
      "template-cosmetic-results",
      "cosmetic-transformation",
      "signatureTreatmentId",
      "featuredGalleryIds",
      "featuredReviewIds",
      "dentistry_treatments",
      "galleries",
      "reviews",
      "link_groups",
      "profile-pics",
      "cosmetic-results-profile.webp",
    ]) {
      expect(verifier).toContain(expected);
    }
  });

  test("ships the real responsive Cosmetic Transformation selector capture", async () => {
    const preview = await readFile(
      resolve(root, "public/previews/template-cosmetic-results.webp"),
    );

    expect(preview.subarray(0, 4).toString()).toBe("RIFF");
    expect(preview.byteLength).toBeGreaterThan(10_000);
  });
});
