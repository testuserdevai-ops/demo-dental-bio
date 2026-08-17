import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const userId = "db010000-0000-4000-8000-000000000001";
const expectedGroups = [1_611_801, 1_611_802] as const;
const expectedVisibleBlogs = [
  1_611_901, 1_611_902, 1_611_903, 1_611_904, 1_611_905, 1_611_906,
] as const;

type LocalStatus = { API_URL?: string; ANON_KEY?: string };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function getEnvironment() {
  const configuredUrl = process.env.E2E_SUPABASE_URL?.trim();
  const configuredKey = process.env.E2E_SUPABASE_ANON_KEY?.trim();
  if (configuredUrl || configuredKey) {
    assert(
      configuredUrl && configuredKey,
      "Set both E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY.",
    );
    return { apiUrl: configuredUrl, anonKey: configuredKey };
  }

  const cli = resolve(process.cwd(), "node_modules/.bin/supabase");
  const { stdout } = await execFileAsync(cli, ["status", "--output", "json"]);
  const status = JSON.parse(stdout) as LocalStatus;
  assert(
    status.API_URL && status.ANON_KEY,
    "Local Supabase status did not return API_URL and ANON_KEY.",
  );
  return { apiUrl: status.API_URL, anonKey: status.ANON_KEY };
}

const { apiUrl, anonKey } = await getEnvironment();
const supabase = createClient(apiUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: session, error: signInError } =
  await supabase.auth.signInWithPassword({
    email: "template-direct-booking@dentalbio.local",
    password: "DentalBioPro123!",
  });
if (signInError) throw signInError;
assert(session.user.id === userId, "Direct Booking identity is not stable.");

const { data: groups, error } = await supabase
  .from("blog_groups")
  .select(
    "id,name,rank,enabled,blogs(id,group_id,title,slug,image_url,rank,enabled)",
  )
  .eq("user_id", userId)
  .eq("enabled", true)
  .eq("blogs.enabled", true)
  .order("rank")
  .order("rank", { referencedTable: "blogs" });
if (error) throw error;

const publicGroups = (groups ?? []).filter(({ name }) => Boolean(name?.trim()));
const visibleBlogs = publicGroups.flatMap(({ id, blogs }) =>
  blogs.filter(
    (blog) =>
      blog.group_id === id &&
      blog.enabled === true &&
      Boolean(blog.title.trim()) &&
      /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/.test(blog.slug.trim()),
  ),
);
assert(
  publicGroups.map(({ id }) => id).join() === expectedGroups.join(),
  "Direct Booking blog groups are missing or out of order.",
);
assert(
  visibleBlogs.map(({ id }) => id).join() === expectedVisibleBlogs.join(),
  "Direct Booking public blogs are capped, missing, or out of order.",
);

console.log(
  `Verified ${publicGroups.length} Direct Booking blog groups and ${visibleBlogs.length} uncapped public posts.`,
);
