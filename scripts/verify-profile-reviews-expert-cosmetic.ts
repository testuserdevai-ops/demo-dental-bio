import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { selectProfileReviews } from "../app/[username]/_lib/profile-reviews";

const execFileAsync = promisify(execFile);

const showcases = [
  {
    name: "Expert and Educator",
    email: "template-expert-educator@dentalbio.local",
    userId: "ed0ca700-0000-4000-8000-000000000001",
    reviewIds: [1_651_601, 1_651_602, 1_651_603, 1_651_604],
    sentinelIds: [1_651_691, 1_651_692, 1_651_693, 1_651_694],
    externalReviewPages: [
      {
        id: 1_651_701,
        href: "https://example.com/willow-family-dental/reviews",
      },
    ],
  },
  {
    name: "Cosmetic Transformation",
    email: "template-cosmetic-results@dentalbio.local",
    userId: "c051e71c-0000-4000-8000-000000000001",
    reviewIds: [1_641_601, 1_641_602, 1_641_603, 1_641_604],
    sentinelIds: [1_641_691, 1_641_692, 1_641_693, 1_641_694],
    externalReviewPages: [
      {
        id: 1_641_701,
        href: "https://example.com/smiles-by-mila-dentistry/reviews",
      },
    ],
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
      .select("id,link")
      .eq("user_id", showcase.userId)
      .order("id", { ascending: false }),
  ]);
  if (reviewsResult.error) throw reviewsResult.error;
  if (pagesResult.error) throw pagesResult.error;

  const inventory = selectProfileReviews(reviewsResult.data, pagesResult.data);
  assert(
    inventory.reviews.map(({ id }) => id).join() === showcase.reviewIds.join(),
    `${showcase.name} reviews are capped, featured-only, missing, or out of order.`,
  );
  assert(
    inventory.reviews.every(({ id }) =>
      showcase.sentinelIds.every((sentinelId) => sentinelId !== id),
    ),
    `${showcase.name} leaked an invalid review sentinel.`,
  );
  assert(
    JSON.stringify(
      inventory.externalReviewPages.map(({ id, href }) => ({ id, href })),
    ) === JSON.stringify(showcase.externalReviewPages),
    `${showcase.name} external review pages are missing, unsafe, or out of order.`,
  );
  assert(
    inventory.reviews.every(({ position }, index) => position === index + 1) &&
      inventory.externalReviewPages.every(
        ({ position }, index) => position === index + 1,
      ),
    `${showcase.name} visible positions are not one-based after filtering.`,
  );

  await supabase.auth.signOut();
  console.log(
    `Verified ${inventory.reviews.length} uncapped ${showcase.name} reviews and ${inventory.externalReviewPages.length} safe external pages.`,
  );
}
