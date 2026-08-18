import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("admin command center exposes an accessible operations map", async ({
  page,
}) => {
  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();

  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: "Account command center" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Admin workspaces" }),
  ).toBeVisible();

  for (const destination of [
    "Overview",
    "Users",
    "Billing",
    "Security",
    "Offer codes",
    "Campaigns",
  ]) {
    await expect(
      page.getByRole("link", { name: destination, exact: true }),
    ).toBeVisible();
  }
  for (const workspace of [
    "Users",
    "Billing",
    "Security",
    "Offer codes",
    "Campaigns",
  ]) {
    await expect(
      page.getByRole("link", { name: `Open ${workspace} workspace` }),
    ).toBeVisible();
  }

  await expect(page.getByText("Registered accounts")).toBeVisible();
  await expect(page.getByText("Pro and Premium Pro")).toBeVisible();
  await expect(page.getByText("Profiles with verification")).toBeVisible();
  await expect(page.getByText("Registered in the last 30 days")).toBeVisible();

  const scan = await new AxeBuilder({ page }).include("main, aside").analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
});

test("admin navigation reaches each dedicated workspace", async ({ page }) => {
  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();

  const destinations = [
    ["Users", "/admin/users", "User Management"],
    ["Billing", "/admin/paid-users", "Paid Users & Income Insights"],
    ["Security", "/admin/security", "Security Dashboard"],
    ["Offer codes", "/admin/offer-codes", "Offer Code Management"],
    ["Campaigns", "/admin/campaigns", "Email Marketing"],
  ] as const;

  for (const [label, href, heading] of destinations) {
    await page
      .getByRole("navigation", { name: "Admin workspaces" })
      .getByRole("link", { name: label })
      .click();
    await expect(page).toHaveURL(new RegExp(`${href}(?:\\?|$)`));
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  await page
    .getByRole("button", { name: "Sign out and leave admin console" })
    .click();
  await expect(page).toHaveURL(/\/(?:\?|$)/);
  await expect(
    page.getByRole("link", { name: "Log in" }).first(),
  ).toBeVisible();
});
