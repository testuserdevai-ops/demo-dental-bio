import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    outputDir: "test-results",
    retries: process.env.CI ? 2 : 0,
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"], viewport: { width: 1600, height: 1000 } },
        },
    ],
    webServer: process.env.PLAYWRIGHT_BASE_URL
        ? undefined // if you point to an already-running env, don't start a server
        : {
            command: "bun run e2e:start",
            url: "http://localhost:3000",
            reuseExistingServer: !process.env.CI,
        },
});
