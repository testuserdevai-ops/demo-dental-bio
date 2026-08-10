import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/dashboard";

test("external boundary: verification renders status and never leaves for Veriff", async ({
  dashboardPage: page,
}) => {
  let requestBody: unknown = "not-called";
  await page.route("**/api/veriff/create-session", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Verification sandbox unavailable" }),
    });
  });
  await page.getByRole("link", { name: "Verification" }).click();
  await expect(page).toHaveURL(/\/dashboard\/verification$/);
  await expect(
    page.getByRole("heading", { name: "Identity verification" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "You haven't verified your identity yet",
    }),
  ).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="verification-manager"]')
    .analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
  const start = page.getByRole("button", { name: "Start now" });
  await start.focus();
  await start.press("Enter");
  await expect(page).toHaveURL(/\/dashboard\/verification$/);
  expect(requestBody).toBeNull();
  await expect(
    page.getByText("Verification sandbox unavailable"),
  ).toBeVisible();
  await expect(start).toBeEnabled();
});
