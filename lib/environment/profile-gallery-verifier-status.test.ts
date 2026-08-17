import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  configuredProfileGalleryEnvironment,
  profileGalleryStatusCommand,
} from "@/scripts/verify-profile-gallery-showcase";

const repositoryRoot = process.cwd();

describe("profile gallery verifier Supabase target", () => {
  test("uses the canonical local status command by default", () => {
    const status = profileGalleryStatusCommand();

    expect(status.allowIsolatedPort).toBe(false);
    expect(status.command).not.toContain("--workdir");
  });

  test("passes a validated in-repository isolated workdir to Supabase status", () => {
    const status = profileGalleryStatusCommand("supabase");

    expect(status.allowIsolatedPort).toBe(true);
    expect(status.command.slice(-2)).toEqual([
      "--workdir",
      resolve(repositoryRoot, "supabase"),
    ]);
  });

  test("accepts only a complete local explicit URL/key pair", () => {
    expect(
      configuredProfileGalleryEnvironment({
        E2E_SUPABASE_URL: "http://127.0.0.1:55321",
        E2E_SUPABASE_ANON_KEY: "local-anon-key",
      }),
    ).toEqual({
      apiUrl: "http://127.0.0.1:55321",
      anonKey: "local-anon-key",
    });
    expect(() =>
      configuredProfileGalleryEnvironment({
        E2E_SUPABASE_URL: "http://127.0.0.1:55321",
      }),
    ).toThrow("Set both E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY");
    expect(() =>
      configuredProfileGalleryEnvironment({
        E2E_SUPABASE_URL: "https://example.supabase.co",
        E2E_SUPABASE_ANON_KEY: "remote-key",
      }),
    ).toThrow("Refusing to verify a non-local Supabase API");
  });
});
