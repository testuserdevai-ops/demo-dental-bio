import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const config = readFileSync(resolve(root, "supabase/config.toml"), "utf8");
const hook = readFileSync(
  resolve(root, "supabase/functions/staging-send-email/index.ts"),
  "utf8",
);
const stagingSeed = readFileSync(
  resolve(root, "supabase/seeds/staging.sql"),
  "utf8",
);

describe("staging infrastructure files", () => {
  test("binds the persistent remote only to the isolated project and seed", () => {
    expect(config).toContain(
      '[remotes.develop]\nproject_id = "pcbakmokevyrpiqvbzni"',
    );
    expect(config).toContain(
      '[remotes.develop.db.seed]\nenabled = true\nsql_paths = ["./seeds/staging.sql"]',
    );
    expect(config).not.toContain("cxqkuqtwrtgvoorxidvn");
  });

  test("uses the official Auth hook action field and fixed staging recipient", () => {
    expect(config).toContain(
      "https://pcbakmokevyrpiqvbzni.supabase.co/functions/v1/staging-send-email",
    );
    expect(hook).toContain("email_action_type");
    expect(hook).not.toMatch(/\baction_type\b/);
    expect(hook).toContain('const STAGING_RECIPIENT = "rameznoshy@gmail.com"');
  });

  test("keeps remote seeding behind the synthetic staging wrapper", () => {
    expect(stagingSeed).toContain("pro@dentalbio.local");
    expect(stagingSeed).toContain("\\ir ../seed.sql");
    expect(stagingSeed).not.toContain("public.public_profiles");
  });
});
