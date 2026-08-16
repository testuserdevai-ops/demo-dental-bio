import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const STAGING_PROJECT_REF = "pcbakmokevyrpiqvbzni";
const LOCAL_STORAGE_ORIGIN = "http://127.0.0.1:54321";
const STAGING_STORAGE_ORIGIN = `https://${STAGING_PROJECT_REF}.supabase.co`;
const repositoryRoot = resolve(import.meta.dir, "..");
const linkedRefPath = resolve(repositoryRoot, "supabase/.temp/project-ref");
const supabaseCli = resolve(repositoryRoot, "node_modules/.bin/supabase");
const seedFiles = [
  "basic.sql",
  "clinic-commerce.sql",
  "cosmetic-transformation.sql",
  "direct-booking.sql",
  "expert-educator.sql",
  "location-provider-router.sql",
  "services-catalogue.sql",
  "specialist-assessment.sql",
  "trust-first-family-practice.sql",
] as const;

async function runSupabase(args: string[]): Promise<void> {
  const process = Bun.spawn([supabaseCli, ...args], {
    cwd: repositoryRoot,
    stderr: "inherit",
    stdout: "inherit",
  });
  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(`Supabase CLI exited with status ${exitCode}.`);
  }
}

async function main() {
  const linkedRef = (await readFile(linkedRefPath, "utf8")).trim();
  if (linkedRef !== STAGING_PROJECT_REF) {
    throw new Error(
      `Refusing to seed any Supabase ref except ${STAGING_PROJECT_REF}.`,
    );
  }

  await runSupabase([
    "db",
    "query",
    "--linked",
    "select current_database() as staging_connection_check",
  ]);

  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "dentalbio-staging-template-seed-"),
  );
  try {
    for (const fileName of seedFiles) {
      const sourcePath = resolve(
        repositoryRoot,
        "supabase/seeds/template-showcases",
        fileName,
      );
      let sql = await readFile(sourcePath, "utf8");
      if (sql.includes("11111111-1111-4111-8111-111111111111")) {
        throw new Error(`${fileName} still depends on the local Pro fixture.`);
      }
      if (
        /(?:insert\s+into|update|delete\s+from)\s+public\.public_profiles/i.test(
          sql,
        )
      ) {
        throw new Error(`${fileName} writes public_profiles directly.`);
      }

      sql = sql.split(LOCAL_STORAGE_ORIGIN).join(STAGING_STORAGE_ORIGIN);
      const temporaryPath = join(temporaryDirectory, basename(fileName));
      await Bun.write(temporaryPath, sql);
      await runSupabase(["db", "query", "--linked", "--file", temporaryPath]);
      console.log(`Applied ${fileName} to ${STAGING_PROJECT_REF}.`);
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }

  console.log(
    `Applied all ${seedFiles.length} template-only fixtures to ${STAGING_PROJECT_REF}.`,
  );
}

await main();
