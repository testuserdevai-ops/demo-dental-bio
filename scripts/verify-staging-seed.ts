import { createClient } from "@supabase/supabase-js";

import { PRODUCTION_SUPABASE_PROJECT_REF } from "../lib/environment/policy";

const EXPECTED_USER_IDS = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
] as const;
const EXPECTED_EMAILS = ["admin@dentalbio.local", "pro@dentalbio.local"];

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
  const { data: authPage, error: authError } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
  if (authError) throw authError;
  const actualEmails = authPage.users
    .map((user) => user.email)
    .filter(Boolean)
    .sort();
  if (process.env.ALLOW_ADDITIONAL_STAGING_USERS !== "1") {
    if (JSON.stringify(actualEmails) !== JSON.stringify(EXPECTED_EMAILS)) {
      throw new Error(
        `Unexpected staging Auth identities: ${actualEmails.join(", ")}`,
      );
    }
  } else {
    for (const email of EXPECTED_EMAILS) {
      if (!actualEmails.includes(email))
        throw new Error(`Missing fixture identity ${email}.`);
    }
  }

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select(
      "id,email,customer_id,subscription_id,plan_id,veriff_session_url,domain_verified,domain_verification_code",
    )
    .in("id", [...EXPECTED_USER_IDS]);
  if (usersError) throw usersError;
  if (users.length !== EXPECTED_USER_IDS.length) {
    throw new Error("The deterministic public.users fixtures are incomplete.");
  }
  for (const user of users) {
    if (
      user.customer_id ||
      user.subscription_id ||
      user.plan_id ||
      user.veriff_session_url ||
      user.domain_verified ||
      user.domain_verification_code
    ) {
      throw new Error(
        `Fixture ${user.email} contains a forbidden provider identifier.`,
      );
    }
  }

  const fixtureUserId = EXPECTED_USER_IDS[0];
  const ownershipChecks = [
    ["dentistries", "user_id"],
    ["groups", "user_id"],
    ["blog_groups", "user_id"],
    ["products", "user_id"],
    ["galleries", "user_id"],
    ["general_galleries", "user_id"],
    ["reviews", "user_id"],
    ["external_review_pages", "user_id"],
  ] as const;
  for (const [table, column] of ownershipChecks) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, fixtureUserId);
    if (error) throw error;
    if (!count) throw new Error(`Missing synthetic ${table} fixtures.`);
  }

  const { data: projection, error: projectionError } = await supabase
    .from("public_profiles")
    .select("profile_id,dentistry_id,username,verified_domain")
    .eq("profile_id", fixtureUserId)
    .maybeSingle();
  if (projectionError) throw projectionError;
  if (!projection || projection.verified_domain) {
    throw new Error(
      "The trigger-generated public profile is missing or unsafe.",
    );
  }

  console.log(`Verified isolated synthetic staging seed on ${actualRef}.`);
}

await main();
