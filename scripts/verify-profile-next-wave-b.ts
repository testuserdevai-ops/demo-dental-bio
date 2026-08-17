import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { selectProfileLocations } from "../app/[username]/_lib/profile-locations";
import { selectProfileProducts } from "../app/[username]/_lib/profile-products";
import { selectProfileVideos } from "../app/[username]/_lib/profile-videos";

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
      !url.password &&
      !url.search &&
      !url.hash,
    "Refusing to verify a non-loopback or ambiguous Supabase API.",
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

const showcases = [
  {
    name: "Location Router",
    username: "template-location-router",
    email: "template-location-router@dentalbio.local",
    userId: "10ca7100-0000-4000-8000-000000000001",
    dentistryId: "10ca7100-0000-4000-8000-000000000002",
    groupBase: 820100,
    videoBase: 821000,
    productBase: 831000,
    locationIds: [
      "10ca7100-0000-4000-8000-000000000101",
      "10ca7100-0000-4000-8000-000000000102",
      "10ca7100-0000-4000-8000-000000000103",
    ],
  },
  {
    name: "Services Catalogue",
    username: "template-services-catalogue",
    email: "template-services-catalogue@dentalbio.local",
    userId: "5e010000-0000-4000-8000-000000000001",
    dentistryId: "5e010000-0000-4000-8000-000000000002",
    groupBase: 820200,
    videoBase: 822000,
    productBase: 832000,
    locationIds: ["5e010000-0000-4000-8000-000000000003"],
  },
  {
    name: "Expert Educator",
    username: "template-expert-educator",
    email: "template-expert-educator@dentalbio.local",
    userId: "ed0ca700-0000-4000-8000-000000000001",
    dentistryId: "ed0ca700-0000-4000-8000-000000000002",
    groupBase: 820300,
    videoBase: 823000,
    productBase: 833000,
    locationIds: [
      "ed0ca700-0000-4000-8000-000000000003",
      "ed0ca700-0000-4000-8000-000000000201",
      "ed0ca700-0000-4000-8000-000000000202",
    ],
  },
] as const;

const { apiUrl, anonKey } = await getEnvironment();

for (const showcase of showcases) {
  const publicClient = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: projection, error: projectionError } = await publicClient
    .from("public_profiles")
    .select("profile_id,dentistry_id,username")
    .eq("username", showcase.username)
    .single();
  if (projectionError) throw projectionError;
  assert(
    projection.profile_id === showcase.userId,
    `${showcase.name} public profile ID drifted.`,
  );
  assert(
    projection.dentistry_id === showcase.dentistryId,
    `${showcase.name} public dentistry ID drifted.`,
  );

  const ownerClient = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInError } =
    await ownerClient.auth.signInWithPassword({
      email: showcase.email,
      password: "DentalBioPro123!",
    });
  if (signInError) throw signInError;
  assert(
    session.user.id === showcase.userId,
    `${showcase.name} authenticated identity drifted.`,
  );

  const load = async () => {
    const [groupsResult, productsResult, locationsResult] = await Promise.all([
      ownerClient
        .from("groups")
        .select("id,name,rank,enabled,datas:videos(id,title,link,rank,enabled)")
        .eq("user_id", showcase.userId)
        .eq("type", "videos")
        .order("rank")
        .order("id")
        .order("rank", { referencedTable: "videos" })
        .order("id", { referencedTable: "videos" }),
      ownerClient
        .from("products")
        .select("id,name,link,platform,image_url,price,currency,rank,enabled")
        .eq("user_id", showcase.userId)
        .order("rank")
        .order("id"),
      ownerClient
        .from("dentistry_locations")
        .select(
          "location_id,locations(country,city,area,latitude,longitude,full_address,business_name,image_url,image_alt,image_decorative)",
        )
        .eq("dentistry_id", showcase.dentistryId)
        .order("location_id"),
    ]);
    if (groupsResult.error) throw groupsResult.error;
    if (productsResult.error) throw productsResult.error;
    if (locationsResult.error) throw locationsResult.error;
    return {
      videos: selectProfileVideos(groupsResult.data),
      products: selectProfileProducts(productsResult.data),
      locations: selectProfileLocations(locationsResult.data),
    };
  };

  for (const phase of ["initial", "reload"] as const) {
    const inventory = await load();
    const expectedVideos = [
      {
        id: String(showcase.groupBase + 1),
        name: `${showcase.name} video guides`,
        videos: [
          [
            String(showcase.videoBase + 1),
            `${showcase.name} first visit guide`,
            1,
          ],
          [
            String(showcase.videoBase + 2),
            `${showcase.name} daily care guide`,
            2,
          ],
        ],
      },
      {
        id: String(showcase.groupBase + 2),
        name: `${showcase.name} demonstrations`,
        videos: [
          [
            String(showcase.videoBase + 3),
            `${showcase.name} treatment demonstration`,
            1,
          ],
          [
            String(showcase.videoBase + 4),
            `${showcase.name} home care demonstration`,
            2,
          ],
        ],
      },
    ];
    const actualVideos = inventory.videos.map((group) => ({
      id: group.id,
      name: group.name,
      videos: group.datas.map((video) => [
        video.id,
        video.title,
        video.position,
      ]),
    }));
    assert(
      JSON.stringify(actualVideos) === JSON.stringify(expectedVideos),
      `${showcase.name} ${phase} video IDs, titles, order, or positions drifted.\nExpected: ${JSON.stringify(expectedVideos)}\nActual: ${JSON.stringify(actualVideos)}`,
    );

    const expectedProducts = [1, 2, 3, 4].map((offset, index) => ({
      id: String(showcase.productBase + offset),
      title: `${showcase.name} ${["daily", "travel", "interdental", "sensitivity"][index]} care kit`,
      position: index + 1,
    }));
    const actualProducts = inventory.products.map(({ id, name, position }) => ({
      id,
      title: name,
      position,
    }));
    assert(
      JSON.stringify(actualProducts) === JSON.stringify(expectedProducts),
      `${showcase.name} ${phase} product IDs, titles, order, or positions drifted.`,
    );

    const actualLocations = inventory.locations.map(
      ({ location_id, position }) => ({ id: location_id, position }),
    );
    const expectedLocations = showcase.locationIds.map((id, index) => ({
      id,
      position: index + 1,
    }));
    assert(
      JSON.stringify(actualLocations) === JSON.stringify(expectedLocations),
      `${showcase.name} ${phase} locations are omitted, duplicated, or reordered.`,
    );
    assert(
      new Set(actualProducts.map(({ id }) => id)).size === 4,
      `${showcase.name} products contain duplicates.`,
    );
    assert(
      inventory.videos.flatMap(({ datas }) => datas).length === 4,
      `${showcase.name} videos are capped or include sentinels.`,
    );
  }

  await ownerClient.auth.signOut();
  console.log(
    `Verified exact ${showcase.name} videos, products, and locations twice.`,
  );
}

const emptyClient = createClient(apiUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: emptyProjection, error: emptyProjectionError } = await emptyClient
  .from("public_profiles")
  .select("profile_id,dentistry_id,username")
  .eq("username", "template-next-wave-b-empty")
  .single();
if (emptyProjectionError) throw emptyProjectionError;
assert(
  emptyProjection.profile_id === "bba70000-0000-4000-8000-000000000001" &&
    emptyProjection.dentistry_id === "bba70000-0000-4000-8000-000000000002",
  "Empty-inventory public projection drifted.",
);
const { error: emptySignInError } = await emptyClient.auth.signInWithPassword({
  email: "template-next-wave-b-empty@dentalbio.local",
  password: "DentalBioPro123!",
});
if (emptySignInError) throw emptySignInError;
const [emptyGroups, emptyProducts] = await Promise.all([
  emptyClient
    .from("groups")
    .select("id,name,rank,enabled,datas:videos(id,title,link,rank,enabled)")
    .eq("user_id", emptyProjection.profile_id)
    .eq("type", "videos"),
  emptyClient
    .from("products")
    .select("id,name,link,platform,image_url,price,currency,rank,enabled")
    .eq("user_id", emptyProjection.profile_id),
]);
if (emptyGroups.error) throw emptyGroups.error;
if (emptyProducts.error) throw emptyProducts.error;
assert(
  selectProfileVideos(emptyGroups.data).length === 0,
  "Empty fixture leaked a video section.",
);
assert(
  selectProfileProducts(emptyProducts.data).length === 0,
  "Empty fixture leaked a Shop section.",
);
await emptyClient.auth.signOut();
console.log("Verified controlled empty video and Shop inventories.");
