import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const root = resolve(import.meta.dirname, "../..");
const seed = readFileSync(
  resolve(
    root,
    "supabase/seeds/template-showcases/cosmetic-transformation.sql",
  ),
  "utf8",
);
const verifier = readFileSync(
  resolve(root, "scripts/verify-cosmetic-gallery-seed.ts"),
  "utf8",
);

describe("Cosmetic gallery showcase contract", () => {
  test("seeds more than the former case cap plus disabled and malformed sentinels", () => {
    for (let id = 1_641_401; id <= 1_641_408; id += 1) {
      expect(seed).toContain(String(id));
    }
    for (const id of [1_641_491, 1_641_492, 1_641_493, 1_641_494]) {
      expect(seed).toContain(String(id));
    }
    expect(seed).toContain("false, 'Before', 'After'");
    expect(seed).toContain("'javascript:alert(1)'");
  });

  test("seeds every ranked general image plus disabled and malformed sentinels", () => {
    for (const id of [
      1_641_501, 1_641_502, 1_641_503, 1_641_504, 1_641_591, 1_641_592,
      1_641_593, 1_641_594,
    ]) {
      expect(seed).toContain(String(id));
    }
    expect(seed).not.toMatch(/insert\s+into\s+public\.public_profiles/i);
  });

  test("ships an isolated-workdir-safe verifier for exact public selection", () => {
    expect(verifier).toContain("LOCAL_SUPABASE_WORKDIR");
    expect(verifier).toContain("validateLocalSupabaseApiUrl");
    expect(verifier).toContain("selectCosmeticGalleries");
    expect(verifier).toContain("selectCosmeticGeneralGalleries");
    expect(verifier).toContain("EXPECTED_CASE_IDS");
    expect(verifier).toContain("EXPECTED_GENERAL_IDS");
  });
});
