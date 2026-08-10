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

  await expect(
    page.getByRole("heading", { name: "Offer Code Management" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add offer code" }).click();
  const offerDialog = page.getByRole("dialog", { name: "Add offer code" });
  await expect(offerDialog.getByLabel("University")).toBeFocused();
  await offerDialog.getByRole("button", { name: "Cancel" }).click();

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
