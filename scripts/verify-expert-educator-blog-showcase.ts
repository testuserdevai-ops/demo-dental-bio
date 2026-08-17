import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

import {
  localSupabaseStatusCommand,
  validateLocalSupabaseApiUrl,
} from "./verify-local-seed";

const execFileAsync = promisify(execFile);
const userId = "ed0ca700-0000-4000-8000-000000000001";
const expectedGroups = [1_651_801, 1_651_802] as const;
const expectedVisibleBlogs = [
  1_651_901, 1_651_902, 1_651_903, 1_651_904, 1_651_905, 1_651_906,
] as const;
const expectedCoverPaths = new Map<number, string | null>([
  [1_651_901, "/previews/preview-1.webp"],
  [1_651_902, "/previews/preview-2.webp"],
  [1_651_903, null],
  [1_651_904, null],
  [1_651_905, null],
  [1_651_906, null],
]);

type LocalStatus = { API_URL?: string; ANON_KEY?: string };
const repositoryRoot = resolve(import.meta.dir, "..");

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
    const apiUrl = validateLocalSupabaseApiUrl(configuredUrl, true);
    return { apiUrl: apiUrl.origin, anonKey: configuredKey };
  }

  const { allowIsolatedPort, command } = localSupabaseStatusCommand(
    process.env.LOCAL_SUPABASE_WORKDIR,
  );
  const [executable, ...args] = command;
  assert(executable, "Local Supabase status command is unavailable.");
  const { stdout } = await execFileAsync(executable, args, {
    cwd: repositoryRoot,
  });
  const status = JSON.parse(stdout) as LocalStatus;
  assert(
    status.API_URL && status.ANON_KEY,
    "Local Supabase status did not return API_URL and ANON_KEY.",
  );
  const apiUrl = validateLocalSupabaseApiUrl(status.API_URL, allowIsolatedPort);
  return { apiUrl: apiUrl.origin, anonKey: status.ANON_KEY };
}

const { apiUrl, anonKey } = await getEnvironment();
const supabase = createClient(apiUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: session, error: signInError } =
  await supabase.auth.signInWithPassword({
    email: "template-expert-educator@dentalbio.local",
    password: "DentalBioPro123!",
  });
if (signInError) throw signInError;
assert(
  session.user.id === userId,
  "Expert and Educator identity is not stable.",
);

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
  "Expert and Educator blog groups are missing or out of order.",
);
assert(
  visibleBlogs.map(({ id }) => id).join() === expectedVisibleBlogs.join(),
  "Expert and Educator public blogs are capped, missing, or out of order.",
);
assert(
  visibleBlogs.every(
    (blog) => expectedCoverPaths.get(blog.id) === (blog.image_url ?? null),
  ),
  "Expert and Educator blog cover paths are missing, unexpected, or invalid.",
);

console.log(
  `Verified ${publicGroups.length} Expert and Educator blog groups, ${visibleBlogs.length} uncapped public posts, and ${[...expectedCoverPaths.values()].filter(Boolean).length} retained cover paths.`,
);
