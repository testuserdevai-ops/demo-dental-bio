"use client";

import { expectTypeOf, test } from "bun:test";
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
