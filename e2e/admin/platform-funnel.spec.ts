import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("platform funnel remains usable at narrow mobile widths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);

  await page.getByRole("link", { name: "Funnel" }).click();
  await expect(page).toHaveURL(/\/admin\/funnel(?:\?|$)/);

  for (const width of [390, 375]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(
      page.getByRole("heading", { name: "Signup and activation funnel" }),
    ).toBeVisible();
    await expect(page.getByLabel("Registered from")).toBeVisible();
    await expect(page.getByLabel("Registered to")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Plan now" })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Signup cohort" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Authoritative stage chain" }),
    ).toBeVisible();
    await expect(page.getByText("First outbound action")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Remaining measurement scope" }),
    ).toBeVisible();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.locator("input, select, button").evaluateAll((controls) =>
        controls.every((control) => control.getBoundingClientRect().height >= 44),
      ),
    ).toBe(true);
  }

  await page.getByRole("combobox", { name: "Plan now" }).selectOption("free");
  await page.getByRole("combobox", { name: "Signup cohort" }).selectOption("organic");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/plan=free/);
  await expect(page).toHaveURL(/cohort=organic/);
  await expect(
    page.getByRole("heading", { name: "Authoritative stage chain" }),
  ).toBeVisible();

  const scan = await new AxeBuilder({ page }).include("main").analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
});
