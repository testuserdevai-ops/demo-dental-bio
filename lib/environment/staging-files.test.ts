import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const config = readFileSync(resolve(root, "supabase/config.toml"), "utf8");
const hook = readFileSync(
  resolve(root, "supabase/functions/staging-send-email/index.ts"),
  "utf8",
);
describe("staging infrastructure files", () => {
  test("binds the persistent remote only to the isolated project", () => {
    expect(config).toContain(
      '[remotes.develop]\nproject_id = "pcbakmokevyrpiqvbzni"',
    );
    expect(config).toContain("[remotes.develop.db.seed]\nenabled = false");
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

  test("requires explicit email test mode in the staging Auth hook", () => {
    expect(hook).toContain('requiredEnvironment("EMAIL_TEST_MODE") !== "true"');
  });
});
