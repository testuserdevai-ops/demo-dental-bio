import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

describe("eight-template treatment/service showcase contract", () => {
  test("the overlay is isolated, last-applied, and covers every pending template", async () => {
    const [seed, applyScript] = await Promise.all([
      readFile(
        resolve(
          root,
          "supabase/seeds/template-showcases/zz-treatment-service-parity.sql",
        ),
        "utf8",
      ),
      readFile(resolve(root, "scripts/apply-staging-template-seed.ts"), "utf8"),
    ]);
    for (const username of [
      "template-direct-booking",
      "template-clinic-commerce",
      "template-cosmetic-results",
      "template-trust-first",
      "template-specialist-assessment",
      "template-location-router",
      "template-expert-educator",
      "template-services-catalogue",
    ]) {
      expect(seed).toContain(username);
    }
    expect(seed).toContain("for item_index in 1..fixture.treatment_count");
    expect(seed).toContain(
      "'template-location-router', 'Location Router', 'Available treatments', 'Available services', 4",
    );
    expect(seed).toContain("for item_index in 1..2");
    expect(seed).not.toMatch(
      /(?:insert\s+into|update|delete\s+from)\s+public\.public_profiles/i,
    );
    expect(
      applyScript.indexOf('"zz-treatment-service-parity.sql"'),
    ).toBeGreaterThan(applyScript.indexOf('"trust-first-family-practice.sql"'));
  });

  test("the verifier requires isolated loopback data and calls the production selector", async () => {
    const source = await readFile(
      resolve(root, "scripts/verify-profile-treatment-services-showcase.ts"),
      "utf8",
    );
    expect(source).toContain("LOCAL_SUPABASE_WORKDIR");
    expect(source).toContain("E2E_SUPABASE_URL");
    expect(source).toContain("selectProfileTreatmentServices");
    expect(source).toContain('.eq("dentistry_id", dentistry.dentistry_id)');
    expect(source).toContain("assertExact");
    expect(source).toContain('protocol === "http:"');
    expect(source).not.toContain("127.0.0.1:54321");
  });

  test("the data-driven E2E proves exact separate uncapped sections for all eight templates", async () => {
    const source = await readFile(
      resolve(
        root,
        "e2e/public-profile-treatment-services-seven-templates.spec.ts",
      ),
      "utf8",
    );
    expect(source.match(/username: "template-[^"]+"/g)).toHaveLength(8);
    expect(source).toContain('data-profile-inventory-kind="treatment"');
    expect(source).toContain('data-profile-inventory-kind="service"');
    expect(source).toContain("AxeBuilder");
    expect(source).toContain("page.reload()");
    expect(source).toContain("data-inventory-position");
    expect(source).toContain("showcase.treatmentIds,");
    expect(source).toContain("showcase.serviceIds,");
  });
});
