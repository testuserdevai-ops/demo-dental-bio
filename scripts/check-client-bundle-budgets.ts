import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import { z } from "zod";

const buildManifestSchema = z.object({
  polyfillFiles: z.array(z.string()),
  rootMainFiles: z.array(z.string()),
});

const clientReferenceManifestSchema = z.object({
  entryCSSFiles: z.record(
    z.string(),
    z.array(z.union([z.string(), z.object({ path: z.string() })])),
  ),
  entryJSFiles: z.record(z.string(), z.array(z.string())),
});

const budgets = [
  { route: "/", manifest: "page", maxGzipBytes: 570_000 },
  { route: "/register", manifest: "register/page", maxGzipBytes: 555_000 },
  {
    route: "/[username]",
    manifest: "[username]/page",
    maxGzipBytes: 520_000,
  },
  {
    route: "/dashboard",
    manifest: "dashboard/page",
    maxGzipBytes: 650_000,
  },
  {
    route: "/dashboard/gallery",
    manifest: "dashboard/gallery/page",
    maxGzipBytes: 630_000,
  },
  {
    route: "/dashboard/review",
    manifest: "dashboard/review/page",
    maxGzipBytes: 630_000,
  },
  {
    route: "/dashboard/subscription",
    manifest: "dashboard/subscription/page",
    maxGzipBytes: 620_000,
  },
  { route: "/admin", manifest: "admin/page", maxGzipBytes: 540_000 },
  {
    route: "/admin/security",
    manifest: "admin/security/page",
    maxGzipBytes: 540_000,
  },
  { route: "/upgrade", manifest: "upgrade/page", maxGzipBytes: 605_000 },
] as const;

const nextDirectory = join(process.cwd(), ".next");
const buildManifest = buildManifestSchema.parse(
  JSON.parse(readFileSync(join(nextDirectory, "build-manifest.json"), "utf8")),
);

function readClientReferenceManifest(manifest: string) {
  const source = readFileSync(
    join(
      nextDirectory,
      "server",
      "app",
      `${manifest}_client-reference-manifest.js`,
    ),
    "utf8",
  );
  const routeAssignment = source.indexOf(" = ", source.indexOf("\n") + 1);

  if (routeAssignment === -1) {
    throw new Error(`Could not parse the client manifest for ${manifest}`);
  }

  return clientReferenceManifestSchema.parse(
    JSON.parse(source.slice(routeAssignment + 3).replace(/;\s*$/, "")),
  );
}

function gzipSize(files: ReadonlySet<string>) {
  let bytes = 0;

  for (const file of files) {
    bytes += gzipSync(readFileSync(join(nextDirectory, file)), {
      level: 9,
    }).byteLength;
  }

  return bytes;
}

let failed = false;

for (const budget of budgets) {
  const manifest = readClientReferenceManifest(budget.manifest);
  const files = new Set([
    ...buildManifest.polyfillFiles,
    ...buildManifest.rootMainFiles,
  ]);

  Object.values(manifest.entryJSFiles).forEach((entryFiles) => {
    entryFiles.forEach((file) => files.add(file));
  });
  Object.values(manifest.entryCSSFiles).forEach((entryFiles) => {
    entryFiles.forEach((file) =>
      files.add(typeof file === "string" ? file : file.path),
    );
  });

  const actualGzipBytes = gzipSize(files);
  const status = actualGzipBytes <= budget.maxGzipBytes ? "PASS" : "FAIL";
  failed ||= status === "FAIL";

  process.stdout.write(
    `${status} ${budget.route}: ${actualGzipBytes.toLocaleString()} / ${budget.maxGzipBytes.toLocaleString()} gzip bytes\n`,
  );
}

if (failed) {
  process.exitCode = 1;
}
