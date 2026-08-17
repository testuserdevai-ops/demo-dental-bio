import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { selectProfileLocations } from "../app/[username]/_lib/profile-locations";
import { selectProfileProducts } from "../app/[username]/_lib/profile-products";
import { selectProfileVideos } from "../app/[username]/_lib/profile-videos";

const execFileAsync = promisify(execFile);
const showcases = [
  {
    name: "Direct Booking",
    username: "template-direct-booking",
    email: "template-direct-booking@dentalbio.local",
    prefix: "db010000",
    mediaBase: 1_710_000,
  },
  {
    name: "Cosmetic Transformation",
    username: "template-cosmetic-results",
    email: "template-cosmetic-results@dentalbio.local",
    prefix: "c051e71c",
    mediaBase: 1_720_000,
  },
] as const;

type LocalStatus = { API_URL?: string; ANON_KEY?: string };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validateLoopbackApiUrl(input: string) {
  const url = new URL(input);
  assert(
    url.protocol === "http:" &&
      ["127.0.0.1", "::1", "[::1]", "localhost"].includes(url.hostname) &&
      Boolean(url.port) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/",
    "Refusing to verify a non-loopback or non-origin Supabase API.",
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

for (const showcase of showcases) {
  const userId = `${showcase.prefix}-0000-4000-8000-000000000001`;
  const dentistryId = `${showcase.prefix}-0000-4000-8000-000000000002`;
  const supabase = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: projection, error: projectionError } = await supabase
    .from("public_profiles")
    .select("profile_id,dentistry_id,username")
    .eq("username", showcase.username)
    .single();
  if (projectionError) throw projectionError;
  assert(
    projection.profile_id === userId && projection.dentistry_id === dentistryId,
    `${showcase.name} public projection identity is not stable.`,
  );

  const { data: session, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: showcase.email,
      password: "DentalBioPro123!",
    });
  if (signInError) throw signInError;
  assert(
    session.user.id === userId,
    `${showcase.name} auth identity is not stable.`,
  );

  const loadInventory = async () => {
    const [groupsResult, productsResult, locationsResult] = await Promise.all([
      supabase
        .from("groups")
        .select("id,name,rank,enabled,datas:videos(id,title,link,rank,enabled)")
        .eq("user_id", userId)
        .eq("type", "videos")
        .eq("enabled", true)
        .eq("videos.enabled", true)
        .order("rank")
        .order("id")
        .order("rank", { referencedTable: "videos" })
        .order("id", { referencedTable: "videos" }),
      supabase
        .from("products")
        .select("id,name,link,platform,image_url,price,currency,rank,enabled")
        .eq("user_id", userId)
        .eq("enabled", true)
        .order("rank")
        .order("id"),
      supabase
        .from("dentistry_locations")
        .select(
          "location_id,locations(country,city,area,latitude,longitude,full_address,business_name,image_url,image_alt,image_decorative)",
        )
        .eq("dentistry_id", dentistryId)
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

  for (const [phase, inventory] of [
    ["initial", await loadInventory()],
    ["reload", await loadInventory()],
  ] as const) {
    const expectedVideos = [
      {
        id: String(showcase.mediaBase + 101),
        name: `${showcase.name} video group A`,
        videos: [1, 2].map((index) => ({
          id: String(showcase.mediaBase + 200 + index),
          title: `${showcase.name} video ${index}`,
          position: index,
        })),
      },
      {
        id: String(showcase.mediaBase + 102),
        name: `${showcase.name} video group B`,
        videos: [3, 4].map((index) => ({
          id: String(showcase.mediaBase + 200 + index),
          title: `${showcase.name} video ${index}`,
          position: index - 2,
        })),
      },
    ];
    const actualVideos = inventory.videos.map((group) => ({
      id: group.id,
      name: group.name,
      videos: group.datas.map(({ id, title, position }) => ({
        id,
        title,
        position,
      })),
    }));
    assert(
      JSON.stringify(actualVideos) === JSON.stringify(expectedVideos),
      `${showcase.name} ${phase} videos differ: ${JSON.stringify(actualVideos)}`,
    );

    const expectedProducts = [1, 2, 3, 4].map((index) => ({
      id: String(showcase.mediaBase + 300 + index),
      name: `${showcase.name} product ${index}`,
      position: index,
    }));
    const actualProducts = inventory.products.map(({ id, name, position }) => ({
      id,
      name,
      position,
    }));
    assert(
      JSON.stringify(actualProducts) === JSON.stringify(expectedProducts),
      `${showcase.name} ${phase} products differ: ${JSON.stringify(actualProducts)}`,
    );

    const expectedLocations = [3, 13, 23].map((suffix, index) => ({
      id: `${showcase.prefix}-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
      title: `${showcase.name} location ${index + 1}`,
      position: index + 1,
      imageUrl:
        `${apiUrl}/storage/v1/object/public/location-images/${userId}` +
        `/dentistries/${dentistryId}/locations/${showcase.prefix}-0000-4000-8000-${String(suffix).padStart(12, "0")}` +
        `/owner-location-${index + 1}.webp`,
      imageAlt:
        index === 0
          ? `${showcase.name} location 1 exterior`
          : index === 1
            ? `${showcase.name} location 2 consultation room`
            : null,
      imageDecorative: index === 2,
    }));
    const actualLocations = inventory.locations.map(
      ({ location_id, locations, position }) => ({
        id: location_id,
        title: locations.business_name,
        position,
        imageUrl: locations.image_url,
        imageAlt: locations.image_alt,
        imageDecorative: locations.image_decorative,
      }),
    );
    assert(
      JSON.stringify(actualLocations) === JSON.stringify(expectedLocations),
      `${showcase.name} ${phase} locations differ: ${JSON.stringify(actualLocations)}`,
    );

    const visibleIds = JSON.stringify({ actualVideos, actualProducts });
    for (const offset of [
      190, 191, 290, 291, 292, 293, 294, 295, 296, 390, 391, 392, 393, 394,
    ]) {
      assert(
        !visibleIds.includes(String(showcase.mediaBase + offset)),
        `${showcase.name} leaked sentinel ${showcase.mediaBase + offset}.`,
      );
    }
  }

  await supabase.auth.signOut();
  console.log(
    `Verified exact ${showcase.name} locations, videos, and products twice.`,
  );
}
