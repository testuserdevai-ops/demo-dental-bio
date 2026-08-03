import { test as base, expect, type Page } from "@playwright/test";
import { createAdminClient } from "../support/test-environment";

type WorkerTenant = {
  runId: string;
  userId: string;
  email: string;
  password: string;
  username: string;
};

type DashboardFixtures = { dashboardPage: Page };
type DashboardWorkerFixtures = { tenant: WorkerTenant };

export const test = base.extend<DashboardFixtures, DashboardWorkerFixtures>({
  tenant: [async ({}, use, workerInfo) => {
    const admin = await createAdminClient();
    const runId = `e2e-${Date.now()}-${workerInfo.parallelIndex}-${crypto.randomUUID().slice(0, 8)}`;
    const email = `${runId}@example.test`;
    const password = `Dbio-${crypto.randomUUID()}!`;
    const username = runId.replace(/[^a-z0-9_-]/g, "").slice(0, 30);
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        first_name: runId,
        last_name: "Test",
        plan_id: "PREMIUM PRO",
        subscription_status: "PREMIUM PRO",
        current_period_end: futureDate,
        trial_end: futureDate,
      },
    });
    if (error || !data.user) throw error || new Error("E2E user creation returned no user");
    const userId = data.user.id;

    try {
      const { error: userError } = await admin.from("users").update({
        plan_id: "PREMIUM PRO",
        subscription_status: "PREMIUM PRO",
        current_period_end: futureDate,
        trial_end: futureDate,
        registered_domain: "dental.bio",
      }).eq("id", userId);
      if (userError) throw userError;
      const { error: dentistryError } = await admin.from("dentistries").insert({
        user_id: userId, about_title: `${runId} profile`, about_text: `${runId} seeded biography`,
      });
      if (dentistryError) throw dentistryError;
      await use({ runId, userId, email, password, username });
    } finally {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
      if (cleanupError) console.error(`E2E cleanup failed for ${runId}: ${cleanupError.message}`);
    }
  }, { scope: "worker" }],

  dashboardPage: async ({ page, tenant }, use) => {
    await page.goto("/login");
    await page.getByPlaceholder("Enter your email").fill(tenant.email);
    await page.getByPlaceholder("Enter your password").fill(tenant.password);
    const dashboardUser = page.waitForResponse((response) =>
      response.url().endsWith("/api/user") &&
      response.request().method() === "POST" &&
      response.ok(),
    );
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    await dashboardUser;
    await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
    await use(page);
  },
});

export { expect };
