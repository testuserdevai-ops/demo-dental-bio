import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { selectProfileLinks } from "../app/[username]/_lib/profile-links";
import { PROFILE_LINK_SHOWCASES } from "../lib/environment/profile-links-seven-template-fixtures";

const execFileAsync = promisify(execFile);

type LocalStatus = { API_URL?: string; ANON_KEY?: string };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validateLoopbackApiUrl(input: string) {
  const url = new URL(input);
  const loopback = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);
  assert(
    url.protocol === "http:" &&
      loopback.has(url.hostname) &&
      Boolean(url.port) &&
      !url.username &&
      !url.password,
    "Refusing to verify a non-loopback Supabase API.",
  );
  return url.origin;
}

async function getEnvironment() {
  const configuredUrl = process.env.E2E_SUPABASE_URL?.trim();
  const configuredKey = process.env.E2E_SUPABASE_ANON_KEY?.trim();
  if (configuredUrl || configuredKey) {
    assert(
      configuredUrl && configuredKey,
      "Set both loopback E2E credentials.",
    );
    return {
      apiUrl: validateLoopbackApiUrl(configuredUrl),
      anonKey: configuredKey,
    };
  }

  const configuredWorkdir = process.env.LOCAL_SUPABASE_WORKDIR?.trim();
  assert(configuredWorkdir, "Set an isolated LOCAL_SUPABASE_WORKDIR.");
  const workdir = realpathSync(resolve(process.cwd(), configuredWorkdir));
  assert(
    statSync(workdir).isDirectory(),
    "LOCAL_SUPABASE_WORKDIR must be a directory.",
  );
  const { stdout } = await execFileAsync(
    resolve(process.cwd(), "node_modules/.bin/supabase"),
    ["status", "--output", "json", "--workdir", workdir],
  );
  const status = JSON.parse(stdout) as LocalStatus;
  assert(
    status.API_URL && status.ANON_KEY,
    "Isolated Supabase status is incomplete.",
  );
  return {
    apiUrl: validateLoopbackApiUrl(status.API_URL),
    anonKey: status.ANON_KEY,
  };
}

const { apiUrl, anonKey } = await getEnvironment();
for (const showcase of PROFILE_LINK_SHOWCASES) {
  const { email, expected, name, prefix, sentinelIds } = showcase;
  const supabase = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password: "DentalBioPro123!",
    });
  if (signInError) throw signInError;
  const dentistryId = `${prefix}-0000-4000-8000-000000000002`;
  assert(session.user.id.startsWith(prefix), `${name} identity is not stable.`);

  const loadInventory = async () => {
    const { data, error } = await supabase
      .from("link_groups")
      .select(
        "link_group_id, heading, rank, dentistry_links ( links ( link_id, title, link, is_active, rank, click_counter, image_url, image_variant, image_alt, image_decorative, is_featured ) )",
      )
      .eq("dentistry_id", dentistryId)
      .order("rank");
    if (error) throw error;
    return selectProfileLinks(data).flatMap((group) => group.links);
  };

  for (const [phase, links] of [
    ["initial", await loadInventory()],
    ["reload", await loadInventory()],
  ] as const) {
    const actual = links.map(({ id, label, position }) => ({
      id,
      title: label,
      position,
    }));
    assert(
      JSON.stringify(actual) === JSON.stringify(expected),
      `${name} ${phase} inventory has extras, omissions, reordered rows, wrong owner titles, or wrong positions.\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`,
    );
    assert(actual.length > 3, `${name} still caps the saved-link inventory.`);
    assert(
      sentinelIds.every((id) => links.every((link) => link.id !== id)),
      `${name} ${phase} leaked an inactive or untitled link.`,
    );
  }
  await supabase.auth.signOut();
  console.log(`Verified ${expected.length} exact ordered ${name} links twice.`);
}
