import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  localSupabaseStorageOrigin,
  localSupabaseStatusCommand,
  resolveLocalSupabaseWorkdir,
  validateLocalSupabaseApiUrl,
} from "@/scripts/verify-local-seed";

const repositoryRoot = process.cwd();

describe("local seed verifier Supabase target", () => {
  test("keeps the canonical repository status and port by default", () => {
    const status = localSupabaseStatusCommand();

    expect(status.allowIsolatedPort).toBe(false);
    expect(status.command).not.toContain("--workdir");
    expect(
      validateLocalSupabaseApiUrl("http://127.0.0.1:54321", false).origin,
    ).toBe("http://127.0.0.1:54321");
    expect(() =>
      validateLocalSupabaseApiUrl("http://127.0.0.1:55321", false),
    ).toThrow("Refusing to verify a non-local Supabase API");
  });

  test("targets an explicit in-repository isolated workdir and loopback port", () => {
    const expectedWorkdir = resolve(repositoryRoot, "supabase");
    const status = localSupabaseStatusCommand("supabase");

    expect(resolveLocalSupabaseWorkdir("supabase")).toBe(expectedWorkdir);
    expect(status.allowIsolatedPort).toBe(true);
    expect(status.command.slice(-2)).toEqual(["--workdir", expectedWorkdir]);
    expect(
      validateLocalSupabaseApiUrl("http://localhost:55321", true).origin,
    ).toBe("http://localhost:55321");
    expect(
      validateLocalSupabaseApiUrl("http://[::1]:55321", true).hostname,
    ).toBe("[::1]");
    expect(localSupabaseStorageOrigin("http://127.0.0.1:55321", true)).toBe(
      "http://127.0.0.1:55321",
    );
  });

  test("refuses external endpoints and workdirs outside the repository", () => {
    expect(() =>
      validateLocalSupabaseApiUrl("https://example.supabase.co", true),
    ).toThrow("Refusing to verify a non-local Supabase API");
    expect(() => resolveLocalSupabaseWorkdir("/tmp")).toThrow(
      "LOCAL_SUPABASE_WORKDIR must resolve to a repository directory",
    );
  });
});
