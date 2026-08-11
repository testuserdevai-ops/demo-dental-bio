import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures/dashboard";

test("Basic remains the compatible sparse profile across dashboard preview and mobile public rendering", async ({
  dashboardPage: page,
  tenant,
}) => {
  await expect(
    page.getByRole("heading", { name: "Basic", level: 2 }),
  ).toBeVisible();
  await expect(page.getByText("Compatibility default")).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Representative Basic template preview",
    }),
  ).toBeVisible();
  await expect(
    page.locator(`iframe[src="/${tenant.username}?analyticsContext=preview"]`),
  ).toBeAttached();

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/${tenant.username}`);

  const template = page.locator('[data-profile-template="basic"]');
  await expect(template).toBeVisible();
  await expect(
    page.getByRole("heading", { name: `${tenant.runId} profile`, level: 1 }),
  ).toBeVisible();
  await expect(page.locator("#treatments")).toBeAttached();
  await expect(page.locator("#links")).toBeEmpty();

  const width = await template.evaluate((element) =>
    Math.ceil(element.getBoundingClientRect().right),
  );
  expect(width).toBeLessThanOrEqual(375);

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
});
