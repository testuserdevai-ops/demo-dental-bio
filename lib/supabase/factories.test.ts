"use client";

import { expect, expectTypeOf, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { supabaseAdmin } from "./admin";
import type { createBrowserSupabaseClient } from "./browser";
import type { Database } from "./database.types";
import type { createServerSupabaseClient } from "./server";

test("Supabase factories expose the canonical Database contract", () => {
  type Tables = Database["public"]["Tables"];

  expectTypeOf<Tables["users"]["Row"]["id"]>().toEqualTypeOf<string>();
  expectTypeOf<ReturnType<typeof createBrowserSupabaseClient>>().toMatchTypeOf<
    SupabaseClient<Database>
  >();
  expectTypeOf<
    Awaited<ReturnType<typeof createServerSupabaseClient>>
  >().toMatchTypeOf<SupabaseClient<Database>>();
  expectTypeOf<typeof supabaseAdmin>().toMatchTypeOf<
    SupabaseClient<Database>
  >();
});

test("a client runtime bundle rejects server and admin factories", () => {
  const result = Bun.spawnSync([
    process.execPath,
    "build",
    "./lib/supabase/client-runtime-boundary.fixture.ts",
    "--target=browser",
  ]);

  expect(result.exitCode).not.toBe(0);
  expect(new TextDecoder().decode(result.stderr)).toContain("server-only");
});
