import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const userId = "c11c0000-0000-4000-8000-000000000001";
const expectedCases = [1_984_501, 1_984_502, 1_984_503, 1_984_504];
const expectedGeneralImages = [
  1_984_601, 1_984_602, 1_984_603, 1_984_604, 1_984_605,
];

type LocalStatus = { API_URL?: string; ANON_KEY?: string };

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

const { apiUrl, anonKey } = await getEnvironment();
const supabase = createClient(apiUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: session, error: signInError } =
  await supabase.auth.signInWithPassword({
    email: "template-clinic-commerce@dentalbio.local",
    password: "DentalBioPro123!",
  });
if (signInError) throw signInError;
assert(
  session.user.id === userId,
  "Clinic and Commerce identity is not stable.",
);

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
  "Clinic and Commerce before-and-after cases are capped, missing, unsafe, or out of order.",
);
assert(
  visibleGeneralImages.map(({ id }) => id).join() ===
    expectedGeneralImages.join(),
  "Clinic and Commerce general images are capped, missing, unsafe, or out of order.",
);

console.log(
  `Verified ${visibleCases.length} uncapped Clinic and Commerce cases and ${visibleGeneralImages.length} uncapped general images.`,
);
