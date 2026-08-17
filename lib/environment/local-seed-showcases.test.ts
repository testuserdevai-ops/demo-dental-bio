import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

import { usernameSchema } from "@/lib/auth/schemas";

const root = process.cwd();

function readLossyWebpDimensions(image: Buffer) {
  expect(image.subarray(0, 4).toString()).toBe("RIFF");
  expect(image.subarray(8, 12).toString()).toBe("WEBP");
  expect(image.subarray(12, 16).toString()).toBe("VP8 ");
  expect(image.subarray(23, 26)).toEqual(Buffer.from([0x9d, 0x01, 0x2a]));
  return {
    width: image.readUInt16LE(26) & 0x3fff,
    height: image.readUInt16LE(28) & 0x3fff,
  };
}

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
    expect(seed).not.toContain("11111111-1111-4111-8111-111111111111");
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
    expect(seed).toContain("location-images/db010000");
    expect(seed).not.toContain("11111111-1111-4111-8111-111111111111");
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
      "treatment_section_title",
      "service_section_title",
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
    expect(seed.match(/object\/public\/location-images/g)?.length).toBe(3);
    expect(seed).toContain("image_decorative");
    expect(seed).toContain("insert into public.reviews");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("registers scoped location image storage with real showcase bytes", async () => {
    const config = await readFile(
      resolve(root, "supabase/config.toml"),
      "utf8",
    );
    const paths = [
      "supabase/storage/location-images/10ca7100-0000-4000-8000-000000000001/dentistries/10ca7100-0000-4000-8000-000000000002/locations/10ca7100-0000-4000-8000-000000000101/harbour-studio.webp",
      "supabase/storage/location-images/10ca7100-0000-4000-8000-000000000001/dentistries/10ca7100-0000-4000-8000-000000000002/locations/10ca7100-0000-4000-8000-000000000102/hove-family.webp",
      "supabase/storage/location-images/10ca7100-0000-4000-8000-000000000001/dentistries/10ca7100-0000-4000-8000-000000000002/locations/10ca7100-0000-4000-8000-000000000103/north-laine.webp",
      "supabase/storage/location-images/db010000-0000-4000-8000-000000000001/dentistries/db010000-0000-4000-8000-000000000002/locations/db010000-0000-4000-8000-000000000003/marylebone-studio.webp",
    ];
    expect(config).toContain("[storage.buckets.location-images]");
    expect(config).toContain('objects_path = "./storage/location-images"');
    for (const path of paths) {
      const image = await readFile(resolve(root, path));
      expect(image.subarray(0, 4).toString()).toBe("RIFF");
      expect(image.byteLength).toBeGreaterThan(1_000);
    }
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

  test("seeds Services Catalogue through private builders with saved catalogue answers", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/services-catalogue.sql"),
      "utf8",
    );

    expect(seed).toContain("do $template_services_catalogue_seed$");
    expect(seed).toContain("template-services-catalogue@dentalbio.local");
    expect(seed).toContain('"username":"template-services-catalogue"');
    expect(seed).toContain("'templateId', 'services-catalogue'");
    expect(seed).toContain("'themeId', 'warm-care'");
    expect(seed).toContain("'layoutVariant', 'section-navigator'");
    expect(seed).toContain("'featuredTreatmentIds'");
    expect(seed).toContain("'showFinancingBeforeTeam', true");
    expect(seed).toContain("insert into public.treatments");
    expect(seed).toContain("insert into public.links");
    expect(seed).toContain("'large-image'");
    expect(seed).toContain("'small-icon'");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("verifies the Services Catalogue projection, modules, and profile image", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-local-seed.ts"),
      "utf8",
    );
    const image = await readFile(
      resolve(
        root,
        "supabase/storage/profile-pics/5e010000-0000-4000-8000-000000000002/services-catalogue-profile-v2.webp",
      ),
    );
    const financeImage = await readFile(
      resolve(
        root,
        "supabase/storage/link-images/5e010000-0000-4000-8000-000000000001/services-catalogue-finance.webp",
      ),
    );
    const financeSource = await readFile(
      resolve(root, "public/previews/hero-image-2.webp"),
    );
    const config = await readFile(
      resolve(root, "supabase/config.toml"),
      "utf8",
    );

    for (const expected of [
      "verifyServicesCatalogueShowcase",
      "template-services-catalogue",
      "services-catalogue",
      "featuredTreatmentIds",
      "showFinancingBeforeTeam",
      "dentistry_treatments",
      "general_galleries",
      "reviews",
      "link_groups",
      "services-catalogue-profile-v2.webp",
      "services-catalogue-finance.webp",
    ]) {
      expect(verifier).toContain(expected);
    }
    expect(readLossyWebpDimensions(image)).toEqual({
      width: 1254,
      height: 1254,
    });
    expect(image.byteLength).toBeGreaterThan(1_000);
    expect(readLossyWebpDimensions(financeImage)).toEqual({
      width: 1024,
      height: 1024,
    });
    expect(createHash("sha256").update(financeImage).digest("hex")).toBe(
      createHash("sha256").update(financeSource).digest("hex"),
    );
    expect(config).toContain("[storage.buckets.link-images]");
    expect(config).toContain('objects_path = "./storage/link-images"');
  });

  test("maps finance planning media separately from the clinician team portrait", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/services-catalogue.sql"),
      "utf8",
    );
    const financeRow = seed.slice(
      seed.indexOf("'Finance and payment guide'"),
      seed.indexOf("'Meet the clinical team'"),
    );
    const teamRow = seed.slice(
      seed.indexOf("'Meet the clinical team'"),
      seed.indexOf("'Frequently asked questions'"),
    );

    expect(financeRow).toContain("services-catalogue-finance.webp");
    expect(financeRow).toContain("public/link-images/");
    expect(financeRow).not.toContain("public/profile-pics/");
    expect(financeRow).not.toContain("services-catalogue-profile-v2.webp");
    expect(teamRow).toContain("services-catalogue-profile-v2.webp");
    expect(teamRow).toContain("public/profile-pics/");
    expect(teamRow).not.toContain("services-catalogue-finance.webp");
  });

  test("keeps the Services Catalogue route inside the username contract", () => {
    const username = "template-services-catalogue";

    expect(username.length).toBeLessThanOrEqual(30);
    expect(usernameSchema.parse(username)).toBe(username);
  });

  test("ships the real responsive Services Catalogue selector capture", async () => {
    const preview = await readFile(
      resolve(root, "public/previews/template-services-catalogue.webp"),
    );

    expect(preview.subarray(0, 4).toString()).toBe("RIFF");
    expect(preview.byteLength).toBeGreaterThan(10_000);
  });

  test("seeds Trust-First through private sources with ordered reassurance answers", async () => {
    const seed = await readFile(
      resolve(
        root,
        "supabase/seeds/template-showcases/trust-first-family-practice.sql",
      ),
      "utf8",
    );

    expect(seed).toContain("do $template_trust_first_seed$");
    expect(seed).toContain("template-trust-first@dentalbio.local");
    expect(seed).toContain('"username":"template-trust-first"');
    expect(seed).toContain("'templateId', 'trust-first-family-practice'");
    expect(seed).toContain("'themeId', 'warm-care'");
    expect(seed).toContain("'featuredReviewIds'");
    expect(seed).toContain("'priorityInformation'");
    expect(seed).toContain("'anxiety-care'");
    expect(seed).toContain("insert into public.general_galleries");
    expect(seed).toContain("insert into public.reviews");
    expect(seed).toContain("'large-image'");
    expect(seed).toContain("'small-icon'");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
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
    expect(seed).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("keeps the Trust-First route in the username contract and ships its profile image", async () => {
    const username = "template-trust-first";
    const source = await readFile(resolve(root, "public/profile.webp"));
    const seeded = await readFile(
      resolve(
        root,
        "supabase/storage/profile-pics/7f570000-0000-4000-8000-000000000002/trust-first-profile.webp",
      ),
    );

    expect(username.length).toBeLessThanOrEqual(30);
    expect(usernameSchema.parse(username)).toBe(username);
    expect(seeded.subarray(0, 4).toString()).toBe("RIFF");
    expect(createHash("sha256").update(seeded).digest("hex")).toBe(
      createHash("sha256").update(source).digest("hex"),
    );
  });

  test("ships reproducible Trust-First link media through the local public bucket", async () => {
    const config = await readFile(
      resolve(root, "supabase/config.toml"),
      "utf8",
    );
    const firstVisit = await readFile(
      resolve(
        root,
        "supabase/storage/link-images/7f570000-0000-4000-8000-000000000001/links/first-visit.webp",
      ),
    );
    const paymentGuide = await readFile(
      resolve(
        root,
        "supabase/storage/link-images/7f570000-0000-4000-8000-000000000001/links/payment-guide.webp",
      ),
    );

    expect(config).toContain("[storage.buckets.link-images]");
    expect(config).toContain('objects_path = "./storage/link-images"');
    expect(firstVisit.subarray(0, 4).toString()).toBe("RIFF");
    expect(paymentGuide.subarray(0, 4).toString()).toBe("RIFF");
    expect(firstVisit.byteLength).toBeGreaterThan(10_000);
    expect(paymentGuide.byteLength).toBeGreaterThan(10_000);
  });

  test("ships the real responsive Trust-First selector capture", async () => {
    const preview = await readFile(
      resolve(root, "public/previews/template-trust-first.webp"),
    );

    expect(preview.subarray(0, 4).toString()).toBe("RIFF");
    expect(preview.byteLength).toBeGreaterThan(10_000);
  });

  test("verifies Trust-First projection, content, map data, media variants, and Storage", async () => {
    const verifier = await readFile(
      resolve(root, "scripts/verify-local-seed.ts"),
      "utf8",
    );

    for (const expected of [
      "verifyTrustFirstShowcase",
      "template-trust-first",
      "trust-first-family-practice",
      "featuredReviewIds",
      "priorityInformation",
      "dentistry_treatments",
      "general_galleries",
      "reviews",
      "image_variant",
      "trust-first-profile.webp",
    ]) {
      expect(verifier).toContain(expected);
    }
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

  test("seeds Clinic and Commerce through private sources with controlled commerce answers", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/clinic-commerce.sql"),
      "utf8",
    );

    expect(seed).toContain("do $template_clinic_commerce_seed$");
    expect(seed).toContain("template-clinic-commerce@dentalbio.local");
    expect(seed).toContain('"username":"template-clinic-commerce"');
    expect(seed).toContain("'templateId', 'clinic-commerce'");
    expect(seed).toContain("'themeId', 'editorial-expert'");
    expect(seed).toContain("'defaultAudience', 'shop'");
    expect(seed).toContain("'featuredProductId', '1984101'");
    expect(seed).toContain("insert into public.products");
    expect(seed).toContain("insert into public.treatments");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
  });

  test("ships deterministic fictional Clinic and Commerce Storage media", async () => {
    const paths = [
      "supabase/storage/profile-pics/c11c0000-0000-4000-8000-000000000002/clinic-commerce-profile.webp",
      "supabase/storage/product-images/c11c0000-0000-4000-8000-000000000001/products/electric-travel-set.webp",
      "supabase/storage/product-images/c11c0000-0000-4000-8000-000000000001/products/sensitive-care-kit.webp",
      "supabase/storage/product-images/c11c0000-0000-4000-8000-000000000001/products/everyday-travel-pouch.webp",
    ];
    for (const path of paths) {
      const image = await readFile(resolve(root, path));
      expect(readLossyWebpDimensions(image)).toEqual({
        width: 1254,
        height: 1254,
      });
      expect(image.byteLength).toBeGreaterThan(20_000);
    }
    const config = await readFile(
      resolve(root, "supabase/config.toml"),
      "utf8",
    );
    expect(config).toContain("[storage.buckets.product-images]");
    expect(config).toContain('objects_path = "./storage/product-images"');
  });

  test("keeps Clinic and Commerce route within the username contract and verifies every relationship", async () => {
    const username = "template-clinic-commerce";
    const verifier = await readFile(
      resolve(root, "scripts/verify-local-seed.ts"),
      "utf8",
    );
    expect(username.length).toBeLessThanOrEqual(30);
    expect(usernameSchema.parse(username)).toBe(username);
    for (const expected of [
      "verifyClinicCommerceShowcase",
      "template-clinic-commerce",
      "clinic-commerce",
      "defaultAudience",
      "featuredProductId",
      "dentistry_treatments",
      "products",
      "reviews",
      "product-images",
      "clinic-commerce-profile.webp",
    ]) {
      expect(verifier).toContain(expected);
    }
  });

  test("ships the real responsive Clinic and Commerce selector capture", async () => {
    const preview = await readFile(
      resolve(root, "public/previews/template-clinic-commerce.webp"),
    );

    expect(readLossyWebpDimensions(preview)).toEqual({
      width: 430,
      height: 764,
    });
    expect(preview.byteLength).toBeGreaterThan(10_000);
  });
  test("seeds Expert and Educator through private sources with audience paths", async () => {
    const seed = await readFile(
      resolve(root, "supabase/seeds/template-showcases/expert-educator.sql"),
      "utf8",
    );

    for (const expected of [
      "do $template_expert_educator_seed$",
      "template-expert-educator@dentalbio.local",
      '"username":"template-expert-educator"',
      "'templateId', 'expert-educator'",
      "'themeId', 'editorial-expert'",
      "'defaultAudience', 'patients'",
      "'featuredContentId'",
      "Patient guides",
      "Professional learning and events",
      "Patient evidence library",
      "Professional teaching notes",
      "Why teeth crack and what to do next",
      "From research paper to chairside explanation",
      "Unpublished professional draft",
      "Post inside a disabled group",
      "'large-image'",
      "'small-icon'",
    ]) {
      expect(seed).toContain(expected);
    }
    expect(seed).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update)\s+public\.public_profiles/i,
    );
    expect(seed.match(/165190[1-6],/g)).toHaveLength(6);
    expect(seed).toContain("1651998");
    expect(seed).toContain("1651999");
  });

  test("keeps the Expert showcase route valid and ships deterministic image assets", async () => {
    const username = "template-expert-educator";
    const paths = [
      "supabase/storage/profile-pics/ed0ca700-0000-4000-8000-000000000002/expert-educator-profile.webp",
      "supabase/storage/link-images/ed0ca700-0000-4000-8000-000000000001/links/cracked-teeth.webp",
      "supabase/storage/link-images/ed0ca700-0000-4000-8000-000000000001/links/gum-health.webp",
      "supabase/storage/link-images/ed0ca700-0000-4000-8000-000000000001/links/masterclass.webp",
    ];

    expect(username.length).toBeLessThanOrEqual(30);
    expect(usernameSchema.parse(username)).toBe(username);
    for (const path of paths) {
      const image = await readFile(resolve(root, path));
      expect(image.subarray(0, 4).toString()).toBe("RIFF");
      expect(image.byteLength).toBeGreaterThan(10_000);
    }
  });

  test("ships the real responsive Expert and Educator selector capture", async () => {
    const preview = await readFile(
      resolve(root, "public/previews/template-expert-educator.webp"),
    );

    expect(readLossyWebpDimensions(preview)).toEqual({
      width: 430,
      height: 764,
    });
    expect(preview.byteLength).toBeGreaterThan(10_000);
  });
});
