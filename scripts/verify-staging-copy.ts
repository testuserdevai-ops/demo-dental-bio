import { createClient } from "@supabase/supabase-js";

import { PRODUCTION_SUPABASE_PROJECT_REF } from "../lib/environment/policy";

const EXPECTED_SNAPSHOT_USERS = 227;
const EXPECTED_SNAPSHOT_STORAGE_OBJECTS = 138;
const EXPECTED_REMOTE_FIXTURE_STORAGE_OBJECTS = 18;
const REQUIRED_ADMIN_EMAIL = "shaz@digimax.co.uk";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function projectRef(url: string): string | null {
  const match = /^([a-z0-9]{20})\.supabase\.co$/i.exec(new URL(url).hostname);
  return match?.[1] ?? null;
}

async function main() {
  const expectedRef = requiredEnvironment("STAGING_SUPABASE_PROJECT_REF");
  const url = requiredEnvironment("STAGING_SUPABASE_URL");
  const actualRef = projectRef(url);
  if (!actualRef || actualRef !== expectedRef) {
    throw new Error(
      "The staging URL does not match the explicitly approved project ref.",
    );
  }
  if (actualRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error("Refusing to inspect the production Supabase project.");
  }

  const supabase = createClient(
    url,
    requiredEnvironment("STAGING_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  async function countStorageObjects(): Promise<number> {
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();
    if (bucketsError) throw bucketsError;

    let count = 0;
    for (const bucket of buckets) {
      const pending = [""];
      while (pending.length) {
        const path = pending.pop() ?? "";
        const { data: entries, error } = await supabase.storage
          .from(bucket.id)
          .list(path, { limit: 1000 });
        if (error) throw error;
        for (const entry of entries) {
          if (entry.id) count += 1;
          else pending.push(path ? `${path}/${entry.name}` : entry.name);
        }
      }
    }
    return count;
  }
  const { data: authPage, error: authError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) throw authError;

  const { count: userCount, error: userCountError } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true });
  if (userCountError) throw userCountError;
  const { count: projectionCount, error: projectionCountError } = await supabase
    .from("public_profiles")
    .select("profile_id", { count: "exact", head: true });
  if (projectionCountError) throw projectionCountError;
  const { data: admin, error: adminError } = await supabase
    .from("users")
    .select("id,role")
    .eq("email", REQUIRED_ADMIN_EMAIL)
    .maybeSingle();
  if (adminError) throw adminError;

  const storageObjectCount = await countStorageObjects();
  const counts = {
    auth: authPage.users.length,
    users: userCount ?? 0,
    projections: projectionCount ?? 0,
    storage: storageObjectCount,
  };

  if (process.env.ALLOW_STAGING_DATA_DRIFT !== "1") {
    if (
      counts.auth !== EXPECTED_SNAPSHOT_USERS ||
      counts.users !== EXPECTED_SNAPSHOT_USERS ||
      counts.projections !== EXPECTED_SNAPSHOT_USERS ||
      counts.storage !==
        EXPECTED_SNAPSHOT_STORAGE_OBJECTS +
          EXPECTED_REMOTE_FIXTURE_STORAGE_OBJECTS
    ) {
      throw new Error(
        `Staging differs from the approved snapshot: ${JSON.stringify(counts)}`,
      );
    }
  } else if (
    counts.auth !== counts.users ||
    counts.users !== counts.projections
  ) {
    throw new Error(
      `Staging identity graphs disagree: ${JSON.stringify(counts)}`,
    );
  }

  if (!admin || admin.role !== "admin") {
    throw new Error("The required staging administrator is missing.");
  }

  console.log(
    `Verified staging snapshot on ${actualRef}: ${JSON.stringify(counts)}.`,
  );
}

await main();
