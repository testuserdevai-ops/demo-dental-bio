import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

import {
  localSupabaseStatusCommand,
  validateLocalSupabaseApiUrl,
} from "./verify-local-seed";

const execFileAsync = promisify(execFile);

type LocalStatus = { API_URL?: string; ANON_KEY?: string };
type VerifierEnvironment = {
  E2E_SUPABASE_ANON_KEY?: string;
  E2E_SUPABASE_URL?: string;
  LOCAL_SUPABASE_WORKDIR?: string;
};

type GalleryVerifierConfig = {
  label: string;
  email: string;
  userId: string;
  expectedCases: readonly number[];
  expectedGeneralImages: readonly number[];
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function safeImage(value: string | null) {
  const input = value?.trim();
  if (!input) return false;
  if (input.startsWith("/")) return !input.includes("..");
  try {
    const url = new URL(input);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const repositoryRoot = resolve(import.meta.dir, "..");

export function configuredProfileGalleryEnvironment(
  environment: VerifierEnvironment,
) {
  const configuredUrl = environment.E2E_SUPABASE_URL?.trim();
  const configuredKey = environment.E2E_SUPABASE_ANON_KEY?.trim();
  if (configuredUrl || configuredKey) {
    assert(
      configuredUrl && configuredKey,
      "Set both E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY.",
    );
    const apiUrl = validateLocalSupabaseApiUrl(configuredUrl, true);
    return { apiUrl: apiUrl.origin, anonKey: configuredKey };
  }
  return null;
}

export function profileGalleryStatusCommand(rawWorkdir?: string) {
  return localSupabaseStatusCommand(rawWorkdir);
}

async function getEnvironment(environment: VerifierEnvironment) {
  const configured = configuredProfileGalleryEnvironment(environment);
  if (configured) return configured;

  const { allowIsolatedPort, command } = profileGalleryStatusCommand(
    environment.LOCAL_SUPABASE_WORKDIR,
  );
  const [executable, ...args] = command;
  assert(executable, "Local Supabase status command is unavailable.");
  const { stdout } = await execFileAsync(executable, args, {
    cwd: repositoryRoot,
  });
  const status = JSON.parse(stdout) as LocalStatus;
  assert(
    status.API_URL && status.ANON_KEY,
    "Local Supabase status did not return API_URL and ANON_KEY.",
  );
  const apiUrl = validateLocalSupabaseApiUrl(status.API_URL, allowIsolatedPort);
  return { apiUrl: apiUrl.origin, anonKey: status.ANON_KEY };
}

export async function verifyProfileGalleryShowcase({
  label,
  email,
  userId,
  expectedCases,
  expectedGeneralImages,
}: GalleryVerifierConfig) {
  const { apiUrl, anonKey } = await getEnvironment({
    E2E_SUPABASE_ANON_KEY: process.env.E2E_SUPABASE_ANON_KEY,
    E2E_SUPABASE_URL: process.env.E2E_SUPABASE_URL,
    LOCAL_SUPABASE_WORKDIR: process.env.LOCAL_SUPABASE_WORKDIR,
  });
  const supabase = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password: "DentalBioPro123!",
    });
  if (signInError) throw signInError;
  assert(session.user.id === userId, `${label} identity is not stable.`);

  const [casesResult, generalResult] = await Promise.all([
    supabase
      .from("galleries")
      .select(
        "id,title,before_image_url,after_image_url,before_image_label,after_image_label,rank,enabled",
      )
      .eq("user_id", userId)
      .order("rank"),
    supabase
      .from("general_galleries")
      .select("id,title,image_url,rank,enabled")
      .eq("user_id", userId)
      .order("rank"),
  ]);
  if (casesResult.error) throw casesResult.error;
  if (generalResult.error) throw generalResult.error;

  const visibleCases = (casesResult.data ?? []).filter(
    (gallery) =>
      gallery.enabled === true &&
      Boolean(gallery.title?.trim()) &&
      safeImage(gallery.before_image_url) &&
      safeImage(gallery.after_image_url),
  );
  const visibleGeneralImages = (generalResult.data ?? []).filter(
    (gallery) =>
      gallery.enabled === true &&
      Boolean(gallery.title?.trim()) &&
      safeImage(gallery.image_url),
  );

  assert(
    visibleCases.map(({ id }) => id).join() === expectedCases.join(),
    `${label} before-and-after cases are capped, missing, unsafe, or out of order.`,
  );
  assert(
    visibleGeneralImages.map(({ id }) => id).join() ===
      expectedGeneralImages.join(),
    `${label} general images are capped, missing, unsafe, or out of order.`,
  );

  console.log(
    `Verified ${visibleCases.length} uncapped ${label} cases and ${visibleGeneralImages.length} uncapped general images.`,
  );
}
