import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type LocalSupabaseStatus = {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
};

export type TestEnvironment = {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

let cachedEnvironment: TestEnvironment | undefined;

async function localStatus(): Promise<LocalSupabaseStatus> {
  try {
    const { stdout } = await execFileAsync("bunx", ["supabase", "status", "--output", "json"]);
    return JSON.parse(stdout) as LocalSupabaseStatus;
  } catch (error) {
    throw new Error("Local Supabase is required for E2E tests.", { cause: error });
  }
}

export async function getTestEnvironment(): Promise<TestEnvironment> {
  if (cachedEnvironment) return cachedEnvironment;

  const configuredUrl = process.env.E2E_SUPABASE_URL;
  const configuredAnon = process.env.E2E_SUPABASE_ANON_KEY;
  const configuredServiceRole = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (configuredUrl || configuredAnon || configuredServiceRole) {
    if (!configuredUrl || !configuredAnon || !configuredServiceRole) {
      throw new Error("Set all three E2E_SUPABASE_* variables, or none to use local Supabase.");
    }
    if (!process.env.E2E_ALLOW_REMOTE_SUPABASE && !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(configuredUrl)) {
      throw new Error("Remote Supabase E2E targets require explicit E2E_ALLOW_REMOTE_SUPABASE=1.");
    }
    cachedEnvironment = {
      supabaseUrl: configuredUrl,
      anonKey: configuredAnon,
      serviceRoleKey: configuredServiceRole,
    };
    return cachedEnvironment;
  }

  const local = await localStatus();
  cachedEnvironment = {
    supabaseUrl: local.API_URL,
    anonKey: local.ANON_KEY,
    serviceRoleKey: local.SERVICE_ROLE_KEY,
  };
  return cachedEnvironment;
}

export async function createAdminClient(): Promise<SupabaseClient> {
  const environment = await getTestEnvironment();
  return createClient(environment.supabaseUrl, environment.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
