import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { selectProfileReviews } from "../app/[username]/_lib/profile-reviews";

const execFileAsync = promisify(execFile);

const showcases = [
  [
    "Direct Booking",
    "template-direct-booking@dentalbio.local",
    "db010000-0000-4000-8000-000000000001",
    [1_611_601, 1_611_602, 1_611_603, 1_611_604],
    [1_611_691, 1_611_692, 1_611_693, 1_611_694],
    [1_611_701, 1_611_702],
    [
      "https://example.com/maya-patel-dentistry/reviews",
      "https://reviews.example.com/maya-patel-dentistry",
    ],
  ],
  [
    "Location or Provider Router",
    "template-location-router@dentalbio.local",
    "10ca7100-0000-4000-8000-000000000001",
    [1_627_601, 1_627_602, 1_627_603, 1_627_604],
    [1_627_691, 1_627_692, 1_627_693, 1_627_694],
    [1_627_701, 1_627_702],
    [
      "https://example.com/maya-rahman/reviews",
      "https://reviews.example.com/maya-rahman",
    ],
  ],
  [
    "Services Catalogue",
    "template-services-catalogue@dentalbio.local",
    "5e010000-0000-4000-8000-000000000001",
    [1_711_601, 1_711_602, 1_711_603, 1_711_604],
    [1_711_691, 1_711_692, 1_711_693, 1_711_694],
    [1_711_701, 1_711_702],
    [
      "https://example.com/morgan-dental-care/reviews",
      "https://reviews.example.com/morgan-dental-care",
    ],
  ],
  [
    "Specialist Assessment",
    "template-specialist-assessment@dentalbio.local",
    "5a5e5500-0000-4000-8000-000000000001",
    [1_655_601, 1_655_602, 1_655_603, 1_655_604],
    [1_655_691, 1_655_692, 1_655_693, 1_655_694],
    [1_655_701, 1_655_702],
    [
      "https://example.com/amara-shah-endodontics/reviews",
      "https://reviews.example.com/amara-shah-endodontics",
    ],
  ],
  [
    "Trust-First Family Practice",
    "template-trust-first@dentalbio.local",
    "7f570000-0000-4000-8000-000000000001",
    [1_637_601, 1_637_602, 1_637_603, 1_637_604],
    [1_637_691, 1_637_692, 1_637_693, 1_637_694],
    [1_637_701, 1_637_702],
    [
      "https://example.com/willow-family-dental/reviews",
      "https://reviews.example.com/willow-family-dental",
    ],
  ],
] as const;

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
      "Set both E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY.",
    );
    return {
      apiUrl: validateLoopbackApiUrl(configuredUrl),
      anonKey: configuredKey,
    };
  }

  const configuredWorkdir = process.env.LOCAL_SUPABASE_WORKDIR?.trim();
  assert(
    configuredWorkdir,
    "Set an isolated LOCAL_SUPABASE_WORKDIR or explicit loopback E2E Supabase credentials.",
  );
  const workdir = realpathSync(resolve(process.cwd(), configuredWorkdir));
  assert(
    statSync(workdir).isDirectory(),
    "LOCAL_SUPABASE_WORKDIR must resolve to a directory.",
  );
  const { stdout } = await execFileAsync(
    resolve(process.cwd(), "node_modules/.bin/supabase"),
    ["status", "--output", "json", "--workdir", workdir],
  );
  const status = JSON.parse(stdout) as LocalStatus;
  assert(
    status.API_URL && status.ANON_KEY,
    "Isolated Supabase status did not return API_URL and ANON_KEY.",
  );
  return {
    apiUrl: validateLoopbackApiUrl(status.API_URL),
    anonKey: status.ANON_KEY,
  };
}

const { apiUrl, anonKey } = await getEnvironment();

for (const [
  name,
  email,
  userId,
  reviewIds,
  sentinelIds,
  externalIds,
  externalHrefs,
] of showcases) {
  const supabase = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password: "DentalBioPro123!",
    });
  if (signInError) throw signInError;
  assert(session.user.id === userId, `${name} identity is not stable.`);

  const [reviewsResult, pagesResult] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "id,reviewer_name,content,stars,image_url,platform,created_at,rank,enabled",
      )
      .eq("user_id", userId)
      .eq("enabled", true)
      .order("rank")
      .order("id"),
    supabase
      .from("external_review_pages")
      .select("id,link,rank,enabled")
      .eq("user_id", userId)
      .eq("enabled", true)
      .order("rank")
      .order("id"),
  ]);
  if (reviewsResult.error) throw reviewsResult.error;
  if (pagesResult.error) throw pagesResult.error;

  const inventory = selectProfileReviews(reviewsResult.data, pagesResult.data);
  assert(
    inventory.reviews.map(({ id }) => id).join() === reviewIds.join(),
    `${name} reviews are capped, missing, unusable, or out of order.`,
  );
  assert(
    inventory.reviews.every(({ id }) =>
      sentinelIds.every((sentinelId) => sentinelId !== id),
    ),
    `${name} leaked an invalid review sentinel.`,
  );
  assert(
    JSON.stringify(
      inventory.externalReviewPages.map(({ id, href }) => ({ id, href })),
    ) ===
      JSON.stringify(
        externalIds.map((id, index) => ({ id, href: externalHrefs[index] })),
      ),
    `${name} external review destination is missing or unsafe.`,
  );
  assert(
    inventory.reviews.every(({ position }, index) => position === index + 1) &&
      inventory.externalReviewPages.every(
        ({ position }, index) => position === index + 1,
      ),
    `${name} positions are not one-based after filtering.`,
  );

  await supabase.auth.signOut();
  console.log(
    `Verified ${inventory.reviews.length} uncapped ${name} reviews and ${inventory.externalReviewPages.length} external destination.`,
  );
}
