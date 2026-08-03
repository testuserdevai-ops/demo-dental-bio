import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";

type LocalSupabaseStatus = {
  ANON_KEY?: string;
  API_URL?: string;
};

type SeedAccount = {
  email: string;
  password: string;
  username: string;
  role: "admin" | "user";
  subscriptionStatus: "PRO" | null;
};

const accounts: SeedAccount[] = [
  {
    email: "pro@dentalbio.local",
    password: "DentalBioPro123!",
    username: "pro-user",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "admin@dentalbio.local",
    password: "DentalBioAdmin123!",
    username: "admin-user",
    role: "admin",
    subscriptionStatus: null,
  },
];

const repositoryRoot = resolve(import.meta.dir, "..");

function getLocalSupabaseStatus(): Required<LocalSupabaseStatus> {
  const status = Bun.spawnSync(
    ["bunx", "supabase", "status", "--output", "json"],
    {
      cwd: repositoryRoot,
      stderr: "pipe",
      stdout: "pipe",
    },
  );

  if (!status.success) {
    throw new Error(
      `Local Supabase is unavailable: ${status.stderr.toString().trim()}`,
    );
  }

  const localStatus = JSON.parse(
    status.stdout.toString(),
  ) as LocalSupabaseStatus;

  if (!localStatus.API_URL || !localStatus.ANON_KEY) {
    throw new Error(
      "Local Supabase status did not return API_URL and ANON_KEY.",
    );
  }

  const apiUrl = new URL(localStatus.API_URL);
  const localHostnames = new Set(["127.0.0.1", "::1", "localhost"]);

  if (
    apiUrl.protocol !== "http:" ||
    !localHostnames.has(apiUrl.hostname) ||
    apiUrl.port !== "54321"
  ) {
    throw new Error(
      `Refusing to verify a non-local Supabase API (${apiUrl.origin}).`,
    );
  }

  return {
    ANON_KEY: localStatus.ANON_KEY,
    API_URL: localStatus.API_URL,
  };
}

async function verifyAccount(
  apiUrl: string,
  anonKey: string,
  account: SeedAccount,
) {
  const supabase = createClient(apiUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

  if (authError || !authData.user) {
    throw new Error(
      `Password authentication failed for ${account.email}: ${authError?.message ?? "no user returned"}`,
    );
  }

  if (authData.user.email !== account.email) {
    throw new Error(`Authenticated the wrong user for ${account.email}.`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, username, role, subscription_status")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `Public profile lookup failed for ${account.email}: ${profileError?.message ?? "no profile returned"}`,
    );
  }

  const actual = {
    id: profile.id,
    role: profile.role,
    subscriptionStatus: profile.subscription_status,
    username: profile.username,
  };
  const expected = {
    id: authData.user.id,
    role: account.role,
    subscriptionStatus: account.subscriptionStatus,
    username: account.username,
  };

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Public profile mismatch for ${account.email}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }

  console.log(`Verified local seed account: ${account.email}`);
}

async function main() {
  const status = getLocalSupabaseStatus();

  for (const account of accounts) {
    await verifyAccount(status.API_URL, status.ANON_KEY, account);
  }

  console.log("Local Supabase seed verification passed.");
}

await main();
