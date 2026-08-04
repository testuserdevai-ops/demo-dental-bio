import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/dashboard";

test("external boundary: subscription renders plan, payment, and history without billing mutations", async ({
  dashboardPage: page,
}) => {
  let legacyMountReads = 0;
  for (const endpoint of ["details", "payment-methods", "billing-history"]) {
    await page.route(`**/api/subscription/${endpoint}*`, (route) => {
      legacyMountReads += 1;
      return route.abort();
    });
  }
  await page.getByRole("link", { name: "Subscription" }).click();
  await expect(page).toHaveURL(/\/dashboard\/subscription$/);
  await expect(
    page.getByRole("heading", { name: "Subscription", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current Plan" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "PRO" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment Methods" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Billing History" }),
  ).toBeVisible();
  await expect(page.getByText("No billing history yet")).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="subscription-manager"]')
    .analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
  expect(legacyMountReads).toBe(0);
});
