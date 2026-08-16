import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const STAGING_PROJECT_REF = "pcbakmokevyrpiqvbzni";
const STAGING_SUPABASE_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
const STAGING_APP_URL =
  "https://dentalbio-staging-rameziophobias-projects.vercel.app";
const STAGING_VERCEL_PROJECT_ID = "prj_kxwpbXd58TM8zgp0aJyqy5edxc8q";
const STAGING_VERCEL_TEAM_ID = "team_U3rOXFQafDz6sjx43d5U3Rjo";
const repositoryRoot = resolve(import.meta.dir, "..");
const supabaseCli = resolve(repositoryRoot, "node_modules/.bin/supabase");

const fixtures = [
  {
    userId: "ba510000-0000-4000-8000-000000000001",
    dentistryId: "ba510000-0000-4000-8000-000000000002",
    email: "template-basic@dentalbio.local",
    username: "template-basic",
    templateId: "basic",
  },
  {
    userId: "db010000-0000-4000-8000-000000000001",
    dentistryId: "db010000-0000-4000-8000-000000000002",
    email: "template-direct-booking@dentalbio.local",
    username: "template-direct-booking",
    templateId: "direct-booking",
  },
  {
    userId: "10ca7100-0000-4000-8000-000000000001",
    dentistryId: "10ca7100-0000-4000-8000-000000000002",
    email: "template-location-router@dentalbio.local",
    username: "template-location-router",
    templateId: "location-provider-router",
  },
  {
    userId: "5e010000-0000-4000-8000-000000000001",
    dentistryId: "5e010000-0000-4000-8000-000000000002",
    email: "template-services-catalogue@dentalbio.local",
    username: "template-services-catalogue",
    templateId: "services-catalogue",
  },
  {
    userId: "c051e71c-0000-4000-8000-000000000001",
    dentistryId: "c051e71c-0000-4000-8000-000000000002",
    email: "template-cosmetic-results@dentalbio.local",
    username: "template-cosmetic-results",
    templateId: "cosmetic-transformation",
  },
  {
    userId: "7f570000-0000-4000-8000-000000000001",
    dentistryId: "7f570000-0000-4000-8000-000000000002",
    email: "template-trust-first@dentalbio.local",
    username: "template-trust-first",
    templateId: "trust-first-family-practice",
  },
  {
    userId: "5a5e5500-0000-4000-8000-000000000001",
    dentistryId: "5a5e5500-0000-4000-8000-000000000002",
    email: "template-specialist-assessment@dentalbio.local",
    username: "template-specialist-assessment",
    templateId: "specialist-assessment",
  },
  {
    userId: "c11c0000-0000-4000-8000-000000000001",
    dentistryId: "c11c0000-0000-4000-8000-000000000002",
    email: "template-clinic-commerce@dentalbio.local",
    username: "template-clinic-commerce",
    templateId: "clinic-commerce",
  },
  {
    userId: "ed0ca700-0000-4000-8000-000000000001",
    dentistryId: "ed0ca700-0000-4000-8000-000000000002",
    email: "template-expert-educator@dentalbio.local",
    username: "template-expert-educator",
    templateId: "expert-educator",
  },
] as const;

type ApiKey = { api_key: string; name: string };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function loadApiKeys(): { anonKey: string; serviceRoleKey: string } {
  const result = Bun.spawnSync(
    [
      supabaseCli,
      "projects",
      "api-keys",
      "--project-ref",
      STAGING_PROJECT_REF,
      "--output",
      "json",
    ],
    { cwd: repositoryRoot, stderr: "pipe", stdout: "pipe" },
  );
  if (!result.success) {
    throw new Error(
      `Unable to read staging API keys: ${result.stderr.toString().trim()}`,
    );
  }
  const keys = JSON.parse(result.stdout.toString()) as ApiKey[];
  const anonKey = keys.find(({ name }) => name === "anon")?.api_key;
  const serviceRoleKey = keys.find(
    ({ name }) => name === "service_role",
  )?.api_key;
  assert(anonKey && serviceRoleKey, "Staging API keys are incomplete.");
  return { anonKey, serviceRoleKey };
}

async function walk(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function sha256(data: Uint8Array): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(data);
  return hasher.digest("hex");
}

async function getRouteHeaders(): Promise<Record<string, string>> {
  const configuredBypass = process.env.STAGING_VERCEL_BYPASS_TOKEN?.trim();
  if (configuredBypass) {
    return { "x-vercel-protection-bypass": configuredBypass };
  }

  const apiToken = process.env.STAGING_VERCEL_API_KEY?.trim();
  if (!apiToken) return {};
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${STAGING_VERCEL_PROJECT_ID}?teamId=${STAGING_VERCEL_TEAM_ID}`,
    { headers: { Authorization: `Bearer ${apiToken}` } },
  );
  assert(
    response.ok,
    "Unable to inspect the staging Vercel protection policy.",
  );
  const project = (await response.json()) as {
    id?: string;
    protectionBypass?: Record<string, unknown>;
  };
  assert(
    project.id === STAGING_VERCEL_PROJECT_ID,
    "Vercel returned a different project.",
  );
  const bypassTokens = Object.keys(project.protectionBypass ?? {});
  assert(
    bypassTokens.length === 1,
    "The staging Vercel project must have exactly one protection bypass token.",
  );
  return { "x-vercel-protection-bypass": bypassTokens[0] };
}

async function main() {
  const { anonKey, serviceRoleKey } = loadApiKeys();
  const supabase = createClient(STAGING_SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authPage, error: authError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) throw authError;
  for (const fixture of fixtures) {
    const authUser = authPage.users.find(({ id }) => id === fixture.userId);
    assert(
      authUser?.email === fixture.email && authUser.email_confirmed_at,
      `Auth user ${fixture.email} is missing, mismatched, or unconfirmed.`,
    );
  }

  const fixtureIds = fixtures.map(({ userId }) => userId);
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select(
      "id,email,username,subscription_status,isVerified,profile_presentation_published",
    )
    .in("id", fixtureIds);
  if (usersError) throw usersError;
  const { data: dentistries, error: dentistriesError } = await supabase
    .from("dentistries")
    .select(
      "user_id,dentistry_id,about_title,about_text,phone,contact_email,booking_link",
    )
    .in("user_id", fixtureIds);
  if (dentistriesError) throw dentistriesError;
  const { data: profiles, error: profilesError } = await supabase
    .from("public_profiles")
    .select("profile_id,dentistry_id,username")
    .in("profile_id", fixtureIds);
  if (profilesError) throw profilesError;

  assert(
    users.length === fixtures.length,
    "The nine public.users rows are incomplete.",
  );
  assert(
    dentistries.length === fixtures.length,
    "The nine dentistry rows are incomplete.",
  );
  assert(
    profiles.length === fixtures.length,
    "The nine trigger-generated public_profiles rows are incomplete.",
  );
  for (const fixture of fixtures) {
    const user = users.find(({ id }) => id === fixture.userId);
    const dentistry = dentistries.find(
      ({ user_id }) => user_id === fixture.userId,
    );
    const profile = profiles.find(
      ({ profile_id }) => profile_id === fixture.userId,
    );
    const presentation = user?.profile_presentation_published as {
      templateId?: string;
    } | null;
    assert(
      user?.email === fixture.email &&
        user.username === fixture.username &&
        user.subscription_status === "PRO" &&
        user.isVerified === true &&
        presentation?.templateId === fixture.templateId,
      `Private profile ${fixture.username} is incomplete.`,
    );
    assert(
      dentistry?.dentistry_id === fixture.dentistryId &&
        Boolean(dentistry.about_title) &&
        (dentistry.about_text?.length ?? 0) > 80 &&
        Boolean(dentistry.phone) &&
        Boolean(dentistry.contact_email) &&
        dentistry.booking_link?.startsWith("https://"),
      `Dentistry ${fixture.username} is incomplete.`,
    );
    assert(
      profile?.dentistry_id === fixture.dentistryId &&
        profile.username === fixture.username,
      `Public route projection ${fixture.username} is incomplete.`,
    );
  }

  const storageRoot = resolve(repositoryRoot, "supabase/storage");
  const localAssets = await walk(storageRoot);
  assert(
    localAssets.length === 18,
    `Expected 18 Storage assets, found ${localAssets.length}.`,
  );
  for (const localPath of localAssets) {
    const relativePath = relative(storageRoot, localPath).split(sep).join("/");
    const [bucket, ...objectParts] = relativePath.split("/");
    const objectPath = objectParts.join("/");
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(objectPath);
    if (error) throw new Error(`${relativePath}: ${error.message}`);
    const [localBytes, remoteBytes] = await Promise.all([
      readFile(localPath),
      data.bytes(),
    ]);
    assert(
      sha256(localBytes) === sha256(remoteBytes),
      `${relativePath} does not match the repository asset.`,
    );
  }

  const routeHeaders = await getRouteHeaders();
  for (const fixture of fixtures) {
    const response = await fetch(`${STAGING_APP_URL}/${fixture.username}`, {
      headers: routeHeaders,
      redirect: "follow",
    });
    assert(
      response.ok,
      `Staging route /${fixture.username} returned ${response.status}.`,
    );
  }

  const detailed = Bun.spawn(
    [process.execPath, "scripts/verify-local-seed.ts", "--staging"],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        STAGING_SUPABASE_ANON_KEY: anonKey,
        STAGING_SUPABASE_PROJECT_REF: STAGING_PROJECT_REF,
        STAGING_SUPABASE_URL,
      },
      stderr: "inherit",
      stdout: "inherit",
    },
  );
  assert(
    (await detailed.exited) === 0,
    "Detailed staging verification failed.",
  );

  console.log(
    `Verified 9 Auth users, private profiles, dentistries, trigger projections, routes, credentials, and 18 Storage assets on ${STAGING_PROJECT_REF}.`,
  );
}

await main();
