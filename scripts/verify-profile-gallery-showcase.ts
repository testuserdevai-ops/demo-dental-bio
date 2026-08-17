import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type LocalStatus = { API_URL?: string; ANON_KEY?: string };

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

async function getEnvironment() {
  const configuredUrl = process.env.E2E_SUPABASE_URL?.trim();
  const configuredKey = process.env.E2E_SUPABASE_ANON_KEY?.trim();
  if (configuredUrl || configuredKey) {
    assert(
      configuredUrl && configuredKey,
      "Set both E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY.",
    );
    return { apiUrl: configuredUrl, anonKey: configuredKey };
  }

  const cli = resolve(process.cwd(), "node_modules/.bin/supabase");
  const { stdout } = await execFileAsync(cli, ["status", "--output", "json"]);
  const status = JSON.parse(stdout) as LocalStatus;
  assert(
    status.API_URL && status.ANON_KEY,
    "Local Supabase status did not return API_URL and ANON_KEY.",
  );
  return { apiUrl: status.API_URL, anonKey: status.ANON_KEY };
}

export async function verifyProfileGalleryShowcase({
  label,
  email,
  userId,
  expectedCases,
  expectedGeneralImages,
}: GalleryVerifierConfig) {
  const { apiUrl, anonKey } = await getEnvironment();
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
