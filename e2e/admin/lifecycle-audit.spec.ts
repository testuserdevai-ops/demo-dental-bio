import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SEEDED_OWNER_ID = "11111111-1111-4111-8111-111111111111";

test("lifecycle audit remains usable at narrow mobile widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);

  await page.getByRole("link", { name: "Lifecycle" }).click();
  await expect(page).toHaveURL(/\/admin\/lifecycle(?:\?|$)/);

  for (const width of [390, 375]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(
      page.getByRole("heading", { name: "Owner lifecycle audit" }),
    ).toBeVisible();
    await expect(page.getByLabel("Owner ID")).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Campaign" }),
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Outcome" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Inspect" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("main input, main select, main button")
        .evaluateAll((controls) =>
          controls.every(
            (control) => control.getBoundingClientRect().height >= 44,
          ),
        ),
    ).toBe(true);
  }

  await page.getByLabel("Owner ID").fill(SEEDED_OWNER_ID);
  await page
    .getByRole("combobox", { name: "Campaign" })
    .selectOption("weekly_performance");
  await page.getByRole("combobox", { name: "Outcome" }).selectOption("sent");
  await page.getByRole("button", { name: "Inspect" }).click();
  await expect(page).toHaveURL(new RegExp(`owner=${SEEDED_OWNER_ID}`));
  await expect(
    page.getByRole("heading", { name: "Delivery policy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Audit events" }),
  ).toBeVisible();
  await expect(page.getByText(/maximum window of 100/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const scan = await new AxeBuilder({ page }).include("main").analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
});
