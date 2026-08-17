import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { selectProfileReviews } from "../app/[username]/_lib/profile-reviews";

const execFileAsync = promisify(execFile);

const showcases = [
  {
    name: "Basic",
    email: "template-basic@dentalbio.local",
    userId: "ba510000-0000-4000-8000-000000000001",
    reviewIds: [1_511_601, 1_511_602, 1_511_603, 1_511_604],
    sentinelIds: [1_511_691, 1_511_692, 1_511_693, 1_511_694],
    externalReviewPages: [
      { id: 1_511_701, href: "https://example.com/dentalbio-demo/reviews" },
      { id: 1_511_702, href: "https://reviews.example.net/dentalbio-demo" },
      { id: 1_511_703, href: "https://feedback.example.org/dentalbio-demo" },
      {
        id: 1_511_704,
        href: "https://community.example.com/dentalbio-demo/reviews",
      },
    ],
    externalSentinelId: 1_511_791,
  },
  {
    name: "Clinic and Commerce",
    email: "template-clinic-commerce@dentalbio.local",
    userId: "c11c0000-0000-4000-8000-000000000001",
    reviewIds: [1_984_201, 1_984_202, 1_984_203, 1_984_204],
    sentinelIds: [1_984_291, 1_984_292, 1_984_293, 1_984_294],
    externalReviewPages: [
      { id: 1_984_701, href: "https://example.com/bennett-dental/reviews" },
      { id: 1_984_702, href: "https://reviews.example.net/bennett-dental" },
      { id: 1_984_703, href: "https://feedback.example.org/bennett-dental" },
      {
        id: 1_984_704,
        href: "https://community.example.com/bennett-dental/reviews",
      },
    ],
    externalSentinelId: 1_984_791,
  },
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
  const cli = resolve(process.cwd(), "node_modules/.bin/supabase");
  const { stdout } = await execFileAsync(cli, [
    "status",
    "--output",
    "json",
    "--workdir",
    workdir,
  ]);
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

for (const showcase of showcases) {
  const supabase = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: showcase.email,
      password: "DentalBioPro123!",
    });
  if (signInError) throw signInError;
  assert(
    session.user.id === showcase.userId,
    `${showcase.name} identity is not stable.`,
  );

  const [reviewsResult, pagesResult] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "id,reviewer_name,content,stars,image_url,platform,created_at,rank,enabled",
      )
      .eq("user_id", showcase.userId)
      .eq("enabled", true)
      .order("rank")
      .order("id"),
    supabase
      .from("external_review_pages")
      .select("id,link,rank,enabled")
      .eq("user_id", showcase.userId)
      .order("rank")
      .order("id"),
  ]);
  if (reviewsResult.error) throw reviewsResult.error;
  if (pagesResult.error) throw pagesResult.error;

  const inventory = selectProfileReviews(reviewsResult.data, pagesResult.data);
  assert(
    inventory.reviews.map(({ id }) => id).join() === showcase.reviewIds.join(),
    `${showcase.name} reviews are capped, missing, unusable, or out of order.`,
  );
  assert(
    inventory.reviews.every(({ id }) =>
      showcase.sentinelIds.every((sentinelId) => sentinelId !== id),
    ),
    `${showcase.name} leaked a disabled, blank, null, or invalid review sentinel.`,
  );
  assert(
    pagesResult.data.some(
      (page) =>
        page.id === showcase.externalSentinelId && page.enabled === false,
    ) &&
      inventory.externalReviewPages.map(({ id }) => id).join() ===
        showcase.externalReviewPages.map(({ id }) => id).join() &&
      inventory.externalReviewPages.map(({ href }) => href).join() ===
        showcase.externalReviewPages.map(({ href }) => href).join(),
    `${showcase.name} external review collection is capped, unsafe, or out of order.`,
  );
  assert(
    inventory.reviews.every(({ position }, index) => position === index + 1) &&
      inventory.externalReviewPages.every(
        ({ position }, index) => position === index + 1,
      ),
    `${showcase.name} review positions are not one-based after filtering.`,
  );

  await supabase.auth.signOut();
  console.log(
    `Verified ${inventory.reviews.length} uncapped ${showcase.name} reviews and ${inventory.externalReviewPages.length} ordered external destinations.`,
  );
}
