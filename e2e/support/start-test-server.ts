import { getTestEnvironment } from "./test-environment";

const environment = await getTestEnvironment();
const port = process.env.PLAYWRIGHT_PORT || "3107";
const baseUrl = `http://localhost:${port}`;
const appEnvironment = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: environment.supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: environment.anonKey,
  SUPABASE_SERVICE_ROLE_KEY: environment.serviceRoleKey,
  NEXT_PUBLIC_BASE_URL: baseUrl,
  APP_URL: baseUrl,
  E2E_DISABLE_EXTERNALS: "1",
  NEXT_PUBLIC_E2E_DISABLE_EXTERNALS: "1",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "re_e2e_nonfunctional",
  STRIPE_SECRET_KEY:
    process.env.STRIPE_SECRET_KEY || "sk_test_e2e_nonfunctional",
  VERIFF_API_KEY: process.env.VERIFF_API_KEY || "e2e-nonfunctional",
  VERIFF_API_URL: process.env.VERIFF_API_URL || "https://veriff.invalid",
  CONTENTFUL_SPACE_ID: process.env.CONTENTFUL_SPACE_ID || "e2e-nonfunctional",
  CONTENTFUL_ACCESS_TOKEN:
    process.env.CONTENTFUL_ACCESS_TOKEN || "e2e-nonfunctional",
  CONTENTFUL_ENVIRONMENT: process.env.CONTENTFUL_ENVIRONMENT || "master",
  // Force the documented local placeholder path; E2E never reads production CMS content.
  CONTENTFUL_ENTRY_ID: "",
};
if (process.env.E2E_SKIP_BUILD !== "1") {
  const build = Bun.spawn(["bun", "run", "build"], {
    env: appEnvironment,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const buildExitCode = await build.exited;
  if (buildExitCode !== 0) process.exit(buildExitCode);
}

const child = Bun.spawn(["bun", "run", "start", "-p", port], {
  env: appEnvironment,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}

process.exit(await child.exited);
