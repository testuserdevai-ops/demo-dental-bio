import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const root = process.argv[2];
const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const serviceRoleKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

if (
  !root ||
  !supabaseUrl?.includes("pcbakmokevyrpiqvbzni") ||
  !serviceRoleKey
) {
  throw new Error(
    "A validated staging URL, service-role key, and backup root are required",
  );
}

const contentTypes = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jfif": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucketEntries = await readdir(root, { withFileTypes: true });
const jobs = [];

for (const entry of bucketEntries) {
  if (!entry.isDirectory()) continue;
  const bucket = entry.name;
  const contentRoot = join(root, bucket, bucket);
  for (const file of await walk(contentRoot)) {
    jobs.push({
      bucket,
      file,
      objectPath: relative(contentRoot, file).split(sep).join("/"),
    });
  }
}

let completed = 0;
const queue = [...jobs];
const workers = Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const job = queue.shift();
    if (!job) return;
    const body = await readFile(job.file);
    const extension = extname(job.file).toLowerCase();
    const { error } = await supabase.storage
      .from(job.bucket)
      .upload(job.objectPath, body, {
        cacheControl: "3600",
        contentType: contentTypes[extension] ?? "application/octet-stream",
        upsert: true,
      });
    if (error)
      throw new Error(`${job.bucket}/${job.objectPath}: ${error.message}`);
    completed += 1;
    if (completed % 25 === 0 || completed === jobs.length) {
      console.log(`Uploaded ${completed}/${jobs.length}`);
    }
  }
});

await Promise.all(workers);
