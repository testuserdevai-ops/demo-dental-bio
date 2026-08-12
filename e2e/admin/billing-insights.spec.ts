import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const paidUsers = [
  {
    customerId: "cus_formula",
    email: "formula@example.test",
    name: '=Formula, "Dental"',
    totalPaid: 80,
    totalRefunded: 20,
    payments: [
      {
        date: 1_785_456_000,
        amount: 100,
        currency: "GBP",
        description: "Pro subscription",
        type: "payment",
      },
      {
        date: 1_785_542_400,
        amount: 20,
        currency: "GBP",
        description: "Partial refund",
        invoiceId: "in_local_refund",
        type: "refund",
      },
    ],
  },
  {
    customerId: "cus_alpha",
    email: "alpha@example.test",
    name: "Alpha Practice",
    totalPaid: 250,
    totalRefunded: 0,
    payments: [
      {
        date: 1_788_134_400,
        amount: 250,
        currency: "GBP",
        description: "Premium subscription",
        type: "payment",
      },
    ],
  },
];

async function logIn(page: import("@playwright/test").Page) {
  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
}

test("billing results can be searched, sorted, exported, and expanded accessibly", async ({
  page,
}) => {
  let incomeRequests = 0;
  await page.route("**/api/admin/income?**", async (route) => {
    incomeRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalIncome: 350,
        totalRefunds: 20,
        totalPaidUsers: 2,
        availableBalance: 330,
        period: { startDate: "2026-07-01", endDate: "2026-07-31" },
        paidUsers,
      }),
    });
  });

  await logIn(page);
  await page.goto("/admin/paid-users");
  await expect(page.getByText("2 results of 2")).toBeVisible();
  await expect(page.getByText("Reporting period:")).toContainText(
    "01/07/2026 – 31/07/2026",
  );

  await page.getByLabel("Search billing results").fill("cus_formula");
  await expect(page.getByText("1 result of 2")).toBeVisible();
  await expect(page.getByText('=Formula, "Dental"')).toBeVisible();
  await expect(page.getByText("Alpha Practice")).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "billing-insights_2026-07-01_to_2026-07-31.csv",
  );
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain('"\'=Formula, ""Dental"""');
  expect(csv).not.toContain("Alpha Practice");

  await page.getByRole("button", { name: "Clear billing search" }).click();
  await page.getByLabel("Sort by").click();
  await page.getByRole("option", { name: "Total refunded" }).click();
  const names = page.locator("tbody > tr").filter({ has: page.locator("td") });
  await expect(names.first()).toContainText("=Formula");

  const expand = page.getByRole("button", {
    name: 'Expand payment history for =Formula, "Dental"',
  });
  await expand.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", {
      name: 'Collapse payment history for =Formula, "Dental"',
    }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Partial refund")).toBeVisible();

  await page.getByLabel("Search billing results").fill("no-match");
  await expect(
    page.getByText("No billing results match your search."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByText("2 results of 2")).toBeVisible();

  const scan = await new AxeBuilder({ page }).include("main, table").analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
  expect(incomeRequests).toBe(1);
});

test("billing export stays unavailable when the provider result fails and retry recovers", async ({
  page,
}) => {
  let incomeRequests = 0;
  await page.route("**/api/admin/income?**", async (route) => {
    incomeRequests += 1;
    if (incomeRequests === 1) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Reporting service unavailable" }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalIncome: 0,
        totalRefunds: 0,
        totalPaidUsers: 0,
        availableBalance: 0,
        period: { startDate: "2026-07-01", endDate: "2026-07-31" },
        paidUsers: [],
      }),
    });
  });

  await logIn(page);
  await page.goto("/admin/paid-users");
  await expect(
    page.locator('[role="alert"]').filter({
      hasText: "Income data could not be refreshed",
    }),
  ).toContainText("Reporting service unavailable");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(
    page.getByText("No paid users found for the selected period."),
  ).toBeVisible();
  expect(incomeRequests).toBe(2);
});
