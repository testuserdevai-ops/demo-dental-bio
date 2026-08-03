import { getTestEnvironment } from "./test-environment";

const environment = await getTestEnvironment();
const child = Bun.spawn(["bun", "run", "start:test"], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: environment.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: environment.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: environment.serviceRoleKey,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    APP_URL: process.env.APP_URL || "http://localhost:3000",
  },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}

process.exit(await child.exited);
