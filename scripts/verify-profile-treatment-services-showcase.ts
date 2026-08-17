import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { selectProfileTreatmentServices } from "../app/[username]/_lib/profile-treatment-services";
import type { PublicProfileViewModel } from "../app/[username]/_lib/public-profile";

const execFileAsync = promisify(execFile);
const showcases = [
  [
    "Direct Booking",
    "template-direct-booking@dentalbio.local",
    "db010000-0000-4000-8000-000000000001",
    6,
    2,
  ],
  [
    "Clinic Commerce",
    "template-clinic-commerce@dentalbio.local",
    "c11c0000-0000-4000-8000-000000000001",
    4,
    4,
  ],
  [
    "Cosmetic Transformation",
    "template-cosmetic-results@dentalbio.local",
    "c051e71c-0000-4000-8000-000000000001",
    6,
    2,
  ],
  [
    "Trust First",
    "template-trust-first@dentalbio.local",
    "7f570000-0000-4000-8000-000000000001",
    6,
    2,
  ],
  [
    "Specialist Assessment",
    "template-specialist-assessment@dentalbio.local",
    "5a5e5500-0000-4000-8000-000000000001",
    6,
    2,
  ],
  [
    "Location Router",
    "template-location-router@dentalbio.local",
    "10ca7100-0000-4000-8000-000000000001",
    3,
    2,
  ],
  [
    "Expert Educator",
    "template-expert-educator@dentalbio.local",
    "ed0ca700-0000-4000-8000-000000000001",
    6,
    2,
  ],
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function loopbackOrigin(input: string) {
  const url = new URL(input);
  assert(
    url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname) &&
      Boolean(url.port) &&
      !url.username &&
      !url.password,
    "Refusing to verify a non-loopback Supabase API.",
  );
  return url.origin;
}

async function environment() {
  const url = process.env.E2E_SUPABASE_URL?.trim();
  const key = process.env.E2E_SUPABASE_ANON_KEY?.trim();
  if (url || key) {
    assert(url && key, "Set both E2E Supabase credentials.");
    return { url: loopbackOrigin(url), key };
  }
  const configured = process.env.LOCAL_SUPABASE_WORKDIR?.trim();
  assert(
    configured,
    "Set an isolated LOCAL_SUPABASE_WORKDIR or explicit loopback credentials.",
  );
  const workdir = realpathSync(resolve(process.cwd(), configured));
  assert(
    statSync(workdir).isDirectory(),
    "LOCAL_SUPABASE_WORKDIR must be a directory.",
  );
  const { stdout } = await execFileAsync(
    resolve(process.cwd(), "node_modules/.bin/supabase"),
    ["status", "--output", "json", "--workdir", workdir],
  );
  const status = JSON.parse(stdout) as { API_URL?: string; ANON_KEY?: string };
  assert(
    status.API_URL && status.ANON_KEY,
    "Isolated Supabase status is incomplete.",
  );
  return { url: loopbackOrigin(status.API_URL), key: status.ANON_KEY };
}

const local = await environment();
for (const [name, email, userId, treatmentCount, serviceCount] of showcases) {
  const client = createClient(local.url, local.key, {
    auth: { persistSession: false },
  });
  const { data: session, error: signInError } =
    await client.auth.signInWithPassword({
      email,
      password: "DentalBioPro123!",
    });
  if (signInError) throw signInError;
  assert(session.user.id === userId, `${name} identity is not stable.`);
  const { data, error } = await client
    .from("dentistry_treatments")
    .select("treatment_id,rank,treatments(title,description,isService)")
    .order("rank")
    .order("treatment_id");
  if (error) throw error;
  const inventory = selectProfileTreatmentServices(
    data as unknown as PublicProfileViewModel["treatments"],
  );
  assert(
    inventory.treatments.length === treatmentCount,
    `${name} treatment inventory is incomplete.`,
  );
  assert(
    inventory.services.length === serviceCount,
    `${name} service inventory is incomplete.`,
  );
  assert(
    [...inventory.treatments, ...inventory.services].every(
      ({ position }, index, all) =>
        position ===
        all.slice(0, index).filter((item) => item.kind === all[index]!.kind)
          .length +
          1,
    ),
    `${name} visible positions are not independent and one-based.`,
  );
  await client.auth.signOut();
  console.log(
    `Verified ${treatmentCount} treatments and ${serviceCount} services for ${name}.`,
  );
}
