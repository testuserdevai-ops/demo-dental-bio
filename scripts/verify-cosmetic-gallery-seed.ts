import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";

import {
  selectCosmeticGalleries,
  selectCosmeticGeneralGalleries,
} from "@/app/[username]/_lib/cosmetic-transformation-template";
import type { Database } from "@/lib/supabase/database.types";
import {
  localSupabaseStatusCommand,
  validateLocalSupabaseApiUrl,
} from "@/scripts/verify-local-seed";

const SHOWCASE_USER_ID = "c051e71c-0000-4000-8000-000000000001";
const SHOWCASE_EMAIL = "template-cosmetic-results@dentalbio.local";
const SHOWCASE_PASSWORD = "DentalBioPro123!";
const EXPECTED_CASE_IDS = Array.from(
  { length: 8 },
  (_, index) => 1_641_401 + index,
);
const EXPECTED_GENERAL_IDS = [1_641_501, 1_641_502, 1_641_503, 1_641_504];

function assertFixture(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(`Cosmetic gallery seed mismatch: ${message}.`);
}

function getLocalStatus() {
  const { allowIsolatedPort, command } = localSupabaseStatusCommand(
    process.env.LOCAL_SUPABASE_WORKDIR,
  );
  const status = Bun.spawnSync(command, {
    cwd: resolve(import.meta.dir, ".."),
    stderr: "pipe",
    stdout: "pipe",
  });
  if (!status.success) {
    throw new Error(
      `Local Supabase is unavailable: ${status.stderr.toString().trim()}`,
    );
  }

  const value = JSON.parse(status.stdout.toString()) as {
    API_URL?: string;
    ANON_KEY?: string;
  };
  assertFixture(
    value.API_URL && value.ANON_KEY,
    "status lacks API_URL or ANON_KEY",
  );
  validateLocalSupabaseApiUrl(value.API_URL, allowIsolatedPort);
  return { apiUrl: value.API_URL, anonKey: value.ANON_KEY };
}

async function main() {
  const { apiUrl, anonKey } = getLocalStatus();
  const client = createClient<Database>(apiUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data: session, error: signInError } =
    await client.auth.signInWithPassword({
      email: SHOWCASE_EMAIL,
      password: SHOWCASE_PASSWORD,
    });
  assertFixture(
    !signInError && session.user?.id === SHOWCASE_USER_ID,
    "owner login failed",
  );

  const [caseResult, generalResult] = await Promise.all([
    client
      .from("galleries")
      .select(
        "id,title,before_image_url,after_image_url,before_image_label,after_image_label,rank,enabled",
      )
      .eq("user_id", SHOWCASE_USER_ID)
      .order("rank"),
    client
      .from("general_galleries")
      .select("id,title,image_url,rank,enabled")
      .eq("user_id", SHOWCASE_USER_ID)
      .order("rank"),
  ]);
  assertFixture(
    !caseResult.error && caseResult.data,
    caseResult.error?.message ?? "case query failed",
  );
  assertFixture(
    !generalResult.error && generalResult.data,
    generalResult.error?.message ?? "general query failed",
  );

  const cases = caseResult.data;
  const general = generalResult.data;
  const selectedCases = selectCosmeticGalleries(
    { featuredGalleryIds: ["1641401", "1641402"] },
    cases.filter(({ enabled }) => enabled === true),
  );
  const selectedGeneral = selectCosmeticGeneralGalleries(
    general.filter(({ enabled }) => enabled === true),
  );

  assertFixture(
    JSON.stringify(selectedCases.map(({ id }) => id)) ===
      JSON.stringify(EXPECTED_CASE_IDS),
    "enabled ranked cases are capped, reordered, or malformed sentinels are visible",
  );
  assertFixture(
    JSON.stringify(selectedGeneral.map(({ id }) => id)) ===
      JSON.stringify(EXPECTED_GENERAL_IDS),
    "enabled ranked general images are capped, reordered, or malformed sentinels are visible",
  );
  assertFixture(
    cases.find(({ id }) => id === 1_641_491)?.enabled === false,
    "disabled case sentinel missing",
  );
  assertFixture(
    cases.find(({ id }) => id === 1_641_492)?.title?.trim() === "",
    "blank case sentinel missing",
  );
  assertFixture(
    cases.find(({ id }) => id === 1_641_493)?.after_image_url === null,
    "incomplete case sentinel missing",
  );
  assertFixture(
    cases.find(({ id }) => id === 1_641_494)?.before_image_url ===
      "javascript:alert(1)",
    "unsafe case sentinel missing",
  );
  assertFixture(
    general.find(({ id }) => id === 1_641_591)?.enabled === false,
    "disabled general sentinel missing",
  );
  assertFixture(
    general.find(({ id }) => id === 1_641_592)?.title?.trim() === "",
    "blank general sentinel missing",
  );
  assertFixture(
    general.find(({ id }) => id === 1_641_593)?.image_url ===
      "javascript:alert(1)",
    "unsafe general sentinel missing",
  );
  assertFixture(
    general.find(({ id }) => id === 1_641_594)?.image_url === null,
    "missing-image general sentinel missing",
  );

  console.log(
    "Cosmetic gallery showcase verified: 8 cases and 4 general images, uncapped and sentinel-safe.",
  );
}

if (import.meta.main) await main();
