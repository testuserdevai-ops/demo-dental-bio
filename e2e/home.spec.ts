import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("log in link is visible in the navigation", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("navigation").getByRole("link", { name: /^log in$/i }),
  ).toBeVisible();
});
