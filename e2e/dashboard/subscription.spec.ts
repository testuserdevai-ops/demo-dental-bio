import { test, expect } from "../fixtures/dashboard";

test("external boundary: subscription renders plan, payment, and history without billing mutations", async ({
  dashboardPage: page,
}) => {
  await page.route("**/api/subscription/details", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        planName: "PREMIUM PRO",
        price: 29,
        currency: "usd",
        renewalDate: "2030-01-01T00:00:00.000Z",
        billingCycle: "monthly",
        trialEnd: null,
        subscriptionDetails: {
          id: "sub_e2e_nonfunctional",
          status: "active",
          cancelAtPeriodEnd: false,
          currentPeriodStart: null,
          currentPeriodEnd: "2030-01-01T00:00:00.000Z",
          trialEnd: null,
        },
      }),
    }),
  );
  await page.getByRole("link", { name: "Subscription" }).click();
  await expect(page).toHaveURL(/\/dashboard\/subscription$/);
  await expect(
    page.getByRole("heading", { name: "Subscription", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current Plan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "PREMIUM PRO" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment Methods" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Billing History" }),
  ).toBeVisible();
  await expect(page.getByText("No billing history yet")).toBeVisible();

  const cancel = page.getByRole("button", { name: "Cancel Subscription" });
  await cancel.click();
  await expect(page.getByText(/Are you sure you want to cancel/)).toBeVisible();
  await page.getByRole("button", { name: "Keep Subscription" }).click();
  await expect(page.getByText(/Are you sure you want to cancel/)).toBeHidden();
  await expect(cancel).toBeVisible();
});
