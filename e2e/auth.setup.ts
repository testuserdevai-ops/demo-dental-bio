import { test, expect } from "./fixtures/dashboard";

test("authenticated dashboard setup is healthy", async ({ dashboardPage: page, tenant }) => {
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByText(tenant.runId, { exact: false }).first()).toBeVisible();
});
