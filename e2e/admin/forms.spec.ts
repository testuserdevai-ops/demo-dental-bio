import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("admin offer-code and marketing forms are usable without provider mutations", async ({
  page,
}) => {
  let blockedMutation = false;
  await page.route("**/api/offer-code", async (route) => {
    if (route.request().method() === "GET") return route.continue();
    blockedMutation = true;
    return route.abort();
  });
  await page.route("**/api/admin/marketing/send", (route) => {
    blockedMutation = true;
    return route.abort();
  });

  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);

  await page.getByRole("link", { name: "Offer codes", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Offer Code Management" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add offer code" }).click();
  const offerDialog = page.getByRole("dialog", { name: "Add offer code" });
  await expect(offerDialog.getByLabel("University")).toBeFocused();
  await offerDialog.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("link", { name: "Campaigns", exact: true }).click();
  await page.getByRole("button", { name: "Send campaign" }).click();
  await expect(page.getByText("Enter a subject")).toBeVisible();
  await expect(page.getByLabel("Subject")).toBeFocused();

  const scan = await new AxeBuilder({ page })
    .include("main, form, table")
    .analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
  expect(blockedMutation).toBe(false);
});

test("admin user-management controls are usable without destructive mutations", async ({
  page,
}) => {
  let mutationAttempted = false;
  await page.route("**/api/user/list", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        count: 1,
        data: [
          {
            id: "00000000-0000-4000-8000-000000000111",
            first_name: "Dental",
            last_name: "Owner",
            email: "owner@example.com",
            username: "owner",
            subscription_status: "PRO",
            isVerified: true,
            dentistries: { dentistry_id: "dentistry-1" },
          },
        ],
      }),
    });
  });
  await page.route("**/api/announcements", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ title: "Notice", content: "Current message" }),
      });
    }
    mutationAttempted = true;
    return route.abort();
  });
  await page.route("**/api/user", async (route) => {
    mutationAttempted = true;
    return route.abort();
  });
  await page.route("**/api/subscription", async (route) => {
    mutationAttempted = true;
    return route.abort();
  });

  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await page.getByRole("link", { name: "Users", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "User Management" }),
  ).toBeVisible();
  await expect(
    page.getByText("owner@example.com", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Filters" }).click();
  const filterDialog = page.getByRole("dialog", { name: "Filter users" });
  await expect(filterDialog.getByLabel("Email")).toBeFocused();
  await filterDialog.getByLabel("Email").fill("owner@example.com");
  await filterDialog.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Universal Message" }).click();
  const announcementDialog = page.getByRole("dialog", {
    name: "Manage announcements",
  });
  await expect(announcementDialog.getByLabel("Title")).toBeFocused();
  await announcementDialog.getByRole("button", { name: "Cancel" }).click();

  await page
    .getByRole("button", { name: "Change plan for owner@example.com" })
    .click();
  const planDialog = page.getByRole("dialog", { name: "Change plan" });
  await planDialog.getByRole("button", { name: "Review plan change" }).click();
  const planConfirmation = page.getByRole("alertdialog", {
    name: "Apply this plan change?",
  });
  await expect(
    planConfirmation.getByRole("button", { name: "Go back" }),
  ).toBeFocused();
  await planConfirmation.getByRole("button", { name: "Go back" }).click();
  await planDialog.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Delete owner@example.com" }).click();
  const deleteDialog = page.getByRole("alertdialog", { name: "Delete user?" });
  await expect(
    deleteDialog.getByRole("button", { name: "Cancel" }),
  ).toBeFocused();
  await deleteDialog.getByRole("button", { name: "Cancel" }).click();

  const scan = await new AxeBuilder({ page }).include("main, table").analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
  expect(mutationAttempted).toBe(false);
});

test("paid-user reporting is keyboard usable without Stripe requests", async ({
  page,
}) => {
  let incomeRequests = 0;
  await page.route("**/api/admin/income?**", async (route) => {
    incomeRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalIncome: 120,
        totalRefunds: 20,
        totalPaidUsers: 1,
        availableBalance: 100,
        period: { startDate: "2026-07-01", endDate: "2026-07-31" },
        paidUsers: [
          {
            customerId: "cus_local_paid_user",
            email: "paid@example.test",
            name: "Paid User",
            totalPaid: 100,
            totalRefunded: 20,
            payments: [
              {
                date: 1_785_456_000,
                amount: 120,
                currency: "GBP",
                description: "Pro subscription",
                type: "payment",
              },
            ],
          },
        ],
      }),
    });
  });

  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await page.getByRole("link", { name: "Billing", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/paid-users(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: "Paid Users & Income Insights" }),
  ).toBeVisible();
  await expect(page.getByText("paid@example.test")).toBeVisible();

  const period = page.getByRole("button", { name: "Select reporting period" });
  await period.click();
  const calendar = page.getByRole("dialog", {
    name: "Choose reporting period",
  });
  await expect(calendar).toBeVisible();
  await expect(calendar.locator("button:focus, select:focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(calendar).toHaveCount(0);
  await expect(period).toBeFocused();

  const expand = page.getByRole("button", {
    name: "Expand payment history for Paid User",
  });
  await expand.click();
  await expect(
    page.getByRole("button", {
      name: "Collapse payment history for Paid User",
    }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Pro subscription")).toBeVisible();

  const scan = await new AxeBuilder({ page }).include("main, table").analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
  expect(incomeRequests).toBe(1);
});

test("security block-list forms preserve keyboard and mutation boundaries", async ({
  page,
}) => {
  let mutationAttempts = 0;
  for (const endpoint of [
    "blocked-domains",
    "blocked-fingerprints",
    "blocked-ips",
    "blocked-users",
    "profile-audit-log",
    "security-logs",
  ]) {
    await page.route(`**/api/admin/${endpoint}**`, async (route) => {
      if (route.request().method() !== "GET") {
        mutationAttempts += 1;
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Local intercepted failure" }),
        });
      }
      if (endpoint === "blocked-users")
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            count: 1,
            data: [
              {
                id: "00000000-0000-4000-8000-000000000111",
                email: "blocked@example.test",
                username: "blocked-user",
                first_name: "Blocked",
                last_name: "User",
                is_blocked: true,
                blocked_reason: "Local fixture",
                blocked_at: "2026-08-01T00:00:00.000Z",
              },
            ],
          }),
        });
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ data: [], count: 0 }),
      });
    });
  }
  await page.route("**/api/user/list", async (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: [], count: 0 }),
    }),
  );

  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await page.goto("/admin/security");

  const tabs = page.getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "Blocked IPs" }).click();
  await page.getByRole("button", { name: "Block IP Address" }).click();
  await page.getByRole("button", { name: "Block IP", exact: true }).click();
  await expect(page.getByText("IP address is required")).toBeVisible();

  await page.getByRole("tab", { name: "Blocked Users" }).click();
  await page.getByRole("button", { name: "Unblock" }).click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Unblock user?",
  });
  await expect(
    confirmation.getByRole("button", { name: "Cancel" }),
  ).toBeFocused();
  await confirmation.getByRole("button", { name: "Unblock" }).click();
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Cancel" }).click();

  const scan = await new AxeBuilder({ page })
    .include('[role="tablist"], [role="tabpanel"], form')
    .analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
  expect(mutationAttempts).toBe(1);
});
