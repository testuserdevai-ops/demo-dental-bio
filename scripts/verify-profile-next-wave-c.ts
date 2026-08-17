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
type ExpectedItem = { id: string; title: string; position: number };

const SHOWCASES = [
  {
    name: "Clinic Commerce",
    username: "template-clinic-commerce",
    profileId: "c11c0000-0000-4000-8000-000000000001",
    dentistryId: "c11c0000-0000-4000-8000-000000000002",
    featuredProductId: "1984101",
    locations: [
      ["c11c0000-0000-4000-8000-000000000101", "Bennett Dental Central"],
      ["c11c0000-0000-4000-8000-000000000102", "Bennett Dental Riverside"],
      ["c11c0000-0000-4000-8000-000000000103", "Bennett Dental North"],
    ],
    videos: [
      ["1984901", "Clinic first video", 1],
      ["1984902", "Clinic second video", 2],
      ["1984903", "Clinic third video", 1],
      ["1984904", "Clinic fourth video", 2],
    ],
    products: [
      ["1984101", "Clinic care product one"],
      ["1984102", "Clinic care product two"],
      ["1984103", "Clinic care product three"],
      ["1984104", "Clinic care product four"],
    ],
    videoSentinels: [
      "1984991",
      "1984992",
      "1984993",
      "1984994",
      "1984995",
      "1984996",
      "1984997",
    ],
    productSentinels: ["1984191", "1984192", "1984193", "1984194", "1984195"],
  },
  {
    name: "Specialist Assessment",
    username: "template-specialist-assessment",
    profileId: "5a5e5500-0000-4000-8000-000000000001",
    dentistryId: "5a5e5500-0000-4000-8000-000000000002",
    featuredProductId: undefined,
    locations: [
      ["5a5e5500-0000-4000-8000-000000000101", "Fitzrovia Endodontic Centre"],
      ["5a5e5500-0000-4000-8000-000000000103", "City Endodontic Rooms"],
      ["5a5e5500-0000-4000-8000-000000000105", "West End Specialist Centre"],
    ],
    videos: [
      ["1655201", "Specialist first video", 1],
      ["1655202", "Specialist second video", 2],
      ["1655203", "Specialist third video", 1],
      ["1655204", "Specialist fourth video", 2],
    ],
    products: [
      ["1655301", "Specialist care product one"],
      ["1655302", "Specialist care product two"],
      ["1655303", "Specialist care product three"],
      ["1655304", "Specialist care product four"],
    ],
    videoSentinels: [
      "1655291",
      "1655292",
      "1655293",
      "1655294",
      "1655295",
      "1655296",
      "1655297",
    ],
    productSentinels: ["1655391", "1655392", "1655393", "1655394", "1655395"],
  },
  {
    name: "Trust-First Family Practice",
    username: "template-trust-first",
    profileId: "7f570000-0000-4000-8000-000000000001",
    dentistryId: "7f570000-0000-4000-8000-000000000002",
    featuredProductId: undefined,
    locations: [
      ["7f570000-0000-4000-8000-000000000003", "Willow Family Dental"],
      ["7f570000-0000-4000-8000-000000000103", "Willow Family Dental East"],
      ["7f570000-0000-4000-8000-000000000105", "Willow Family Dental South"],
    ],
    videos: [
      ["1637201", "Family first video", 1],
      ["1637202", "Family second video", 2],
      ["1637203", "Family third video", 1],
      ["1637204", "Family fourth video", 2],
    ],
    products: [
      ["1637301", "Family care product one"],
      ["1637302", "Family care product two"],
      ["1637303", "Family care product three"],
      ["1637304", "Family care product four"],
    ],
    videoSentinels: [
      "1637291",
      "1637292",
      "1637293",
      "1637294",
      "1637295",
      "1637296",
      "1637297",
    ],
    productSentinels: ["1637391", "1637392", "1637393", "1637394", "1637395"],
  },
] as const;

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
      url.pathname === "/" &&
      !url.search &&
      !url.hash,
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

function exactItems(
  items: readonly (readonly [string, string])[],
): ExpectedItem[] {
  return items.map(([id, title], index) => ({
    id,
    title,
    position: index + 1,
  }));
}

const { apiUrl, anonKey } = await getEnvironment();
const supabase = createClient(apiUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const showcase of SHOWCASES) {
  const load = async () => {
    const [identity, locations, videos, products] = await Promise.all([
      supabase
        .from("public_profiles")
        .select("profile_id, dentistry_id, username, profile_presentation")
        .eq("username", showcase.username)
        .single(),
      supabase
        .from("dentistry_locations")
        .select(
          "location_id, locations (country, city, area, latitude, longitude, full_address, business_name, image_url, image_alt, image_decorative)",
        )
        .eq("dentistry_id", showcase.dentistryId)
        .order("location_id"),
      supabase
        .from("groups")
        .select(
          "id, name, rank, enabled, datas:videos (id, title, link, rank, enabled)",
        )
        .eq("user_id", showcase.profileId)
        .eq("type", "videos")
        .eq("enabled", true)
        .eq("videos.enabled", true)
        .order("rank")
        .order("id")
        .order("rank", { referencedTable: "videos" })
        .order("id", { referencedTable: "videos" }),
      supabase
        .from("products")
        .select(
          "id, name, link, platform, image_url, price, currency, rank, enabled",
        )
        .eq("user_id", showcase.profileId)
        .eq("enabled", true)
        .order("rank")
        .order("id"),
    ]);
    for (const result of [identity, locations, videos, products]) {
      if (result.error) throw result.error;
    }
    const publicIdentity = identity.data;
    assert(
      publicIdentity,
      `${showcase.name} public profile projection is missing.`,
    );
    assert(
      publicIdentity.profile_id === showcase.profileId,
      `${showcase.name} public profile ID drifted.`,
    );
    assert(
      publicIdentity.dentistry_id === showcase.dentistryId,
      `${showcase.name} public dentistry ID drifted.`,
    );
    assert(
      publicIdentity.profile_presentation,
      `${showcase.name} public presentation projection is missing.`,
    );
    return {
      locations: selectProfileLocations(locations.data),
      videos: selectProfileVideos(videos.data),
      products: selectProfileProducts(
        products.data,
        showcase.featuredProductId,
      ),
    };
  };

  for (const phase of ["initial", "reload"] as const) {
    const inventory = await load();
    const actualLocations = inventory.locations.map((item) => ({
      id: item.location_id,
      title: item.locations.business_name?.trim() ?? "",
      position: item.position,
    }));
    const actualVideos = inventory.videos.flatMap((group) =>
      group.datas.map((item) => ({
        id: item.id,
        title: item.title,
        position: item.position,
      })),
    );
    const actualProducts = inventory.products.map((item) => ({
      id: item.id,
      title: item.name,
      position: item.position,
    }));
    const expectedVideos = showcase.videos.map(([id, title, position]) => ({
      id,
      title,
      position,
    }));
    for (const [feature, actual, expected] of [
      ["locations", actualLocations, exactItems(showcase.locations)],
      ["videos", actualVideos, expectedVideos],
      ["products", actualProducts, exactItems(showcase.products)],
    ] as const) {
      assert(
        JSON.stringify(actual) === JSON.stringify(expected),
        `${showcase.name} ${phase} ${feature} inventory differs.\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`,
      );
    }
    const videoIds = new Set(actualVideos.map(({ id }) => id));
    const productIds = new Set(actualProducts.map(({ id }) => id));
    assert(
      showcase.videoSentinels.every((id) => !videoIds.has(id)),
      `${showcase.name} leaked a video sentinel.`,
    );
    assert(
      showcase.productSentinels.every((id) => !productIds.has(id)),
      `${showcase.name} leaked a product sentinel.`,
    );
  }
  console.log(
    `Verified exact ${showcase.name} locations, videos, and products twice.`,
  );
}
