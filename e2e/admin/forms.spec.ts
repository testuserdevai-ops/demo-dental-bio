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
