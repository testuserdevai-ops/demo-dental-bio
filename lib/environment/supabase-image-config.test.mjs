import { describe, expect, test } from "bun:test";

import { getSupabaseImageRemotePattern } from "./supabase-image-config.mjs";

describe("Supabase image remote pattern", () => {
  test("uses the production project when no environment URL is configured", () => {
    expect(getSupabaseImageRemotePattern({})).toEqual({
      protocol: "https",
      hostname: "cxqkuqtwrtgvoorxidvn.supabase.co",
      port: "",
      pathname: "/storage/v1/**",
    });
  });

  test("uses the configured staging project", () => {
    expect(
      getSupabaseImageRemotePattern({
        NEXT_PUBLIC_SUPABASE_URL: "https://pcbakmokevyrpiqvbzni.supabase.co",
      }),
    ).toEqual({
      protocol: "https",
      hostname: "pcbakmokevyrpiqvbzni.supabase.co",
      port: "",
      pathname: "/storage/v1/**",
    });
  });

  test("preserves local Supabase protocol and port", () => {
    expect(
      getSupabaseImageRemotePattern({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }),
    ).toEqual({
      protocol: "http",
      hostname: "127.0.0.1",
      port: "54321",
      pathname: "/storage/v1/**",
    });
  });

  test("rejects unsupported protocols", () => {
    expect(() =>
      getSupabaseImageRemotePattern({
        NEXT_PUBLIC_SUPABASE_URL: "ftp://example.com",
      }),
    ).toThrow("must use the http or https protocol");
  });
});
