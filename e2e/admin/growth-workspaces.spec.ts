import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function signInAsAdmin(page: Page) {
  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
}

test("offer-code workspace searches, sorts, clears, and remains accessible", async ({
  page,
}) => {
  await signInAsAdmin(page);
  let loadAttempts = 0;
  await page.route("**/api/offer-code", async (route) => {
    if (route.request().method() === "GET") {
      loadAttempts += 1;
      if (loadAttempts === 1) {
        await route.fulfill({
          status: 503,
          json: { error: "Offer inventory temporarily unavailable" },
        });
        return;
      }
      await route.fulfill({
        json: [
          { id: 2, university: "Zurich University", offer_code: "ZRH26" },
          { id: 1, university: "Alpha University", offer_code: "ALPHA26" },
        ],
      });
      return;
    }
    await route.fulfill({ status: 500, json: { error: "Unexpected write" } });
  });

  await page.goto("/admin/offer-codes");
  await expect(
    page.getByText("Find and maintain the university offer codes"),
  ).toBeVisible();
  await expect(
    page.getByText("Offer inventory temporarily unavailable"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("2 results")).toBeVisible();
  const rows = page.getByRole("table").getByRole("row");
  await expect(rows.nth(1)).toContainText("Alpha University");
  await expect(rows.nth(2)).toContainText("Zurich University");

  await page.getByLabel("Search offer codes").fill("zrh26");
  await expect(page.getByText("1 result for “zrh26”")).toBeVisible();
  await expect(page.getByText("Alpha University")).toBeHidden();
  await page.getByLabel("Search offer codes").fill("missing-code");
  await expect(
    page.getByText("No offer codes match your search."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByText("2 results")).toBeVisible();

  const scan = await new AxeBuilder({ page }).include("main").analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
});

test("campaign workspace summarizes recipients and requires final confirmation", async ({
  page,
}) => {
  await signInAsAdmin(page);
  let sendRequests = 0;
  await page.route("**/api/admin/marketing/send", async (route) => {
    sendRequests += 1;
    await route.fulfill({
      status: 503,
      json: { error: "Test delivery is disabled" },
    });
  });

  await page.goto("/admin/campaigns");
  await expect(
    page.getByText("Compose a branded campaign", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Subject").fill("A useful update");
  await page.getByLabel("Recipients (CSV)").setInputFiles({
    name: "campaign.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "email,first_name\nreader@example.test,Reader\nREADER@example.test,Duplicate\nbad-address,Invalid",
    ),
  });

  const summary = page.getByRole("region", { name: "Recipient summary" });
  await expect(summary.getByText("3 CSV rows reviewed.")).toBeVisible();
  await expect(
    summary.getByRole("group", {
      name: "Valid recipients: 1",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    summary.getByRole("group", { name: "Duplicates: 1", exact: true }),
  ).toBeVisible();
  await expect(
    summary.getByRole("group", {
      name: "Invalid recipients: 1",
      exact: true,
    }),
  ).toBeVisible();
  expect(sendRequests).toBe(0);

  await page.getByRole("button", { name: "Send campaign" }).click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Send this campaign?",
  });
  await expect(confirmation).toBeVisible();
  expect(sendRequests).toBe(0);
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  expect(sendRequests).toBe(0);

  const scan = await new AxeBuilder({ page }).include("main").analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
});
