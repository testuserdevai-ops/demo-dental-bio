import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures/dashboard";

test("Basic renders the populated showcase across dashboard preview and mobile public rendering", async ({
  dashboardPage: page,
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
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/template-basic");

  const template = page.locator('[data-profile-template="basic"]');
  await expect(template).toBeVisible();
  await expect(
    page.locator('[data-profile-theme="clinical-light"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("heading", {
      name: "Complete care for confident smiles",
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Complete care for confident smiles" }),
  ).toHaveAttribute("src", /profile-pics.*basic-profile\.webp/);
  await expect(page.locator("#treatments")).toBeAttached();
  await expect(page.locator("#services")).toBeAttached();
  await expect(page.locator("#links")).not.toBeEmpty();
  await expect(page.locator("#blog")).toBeAttached();
  await expect(page.locator("#video")).toBeAttached();
  await expect(page.locator("#gallery").first()).toBeAttached();
  await expect(page.locator("#review")).toBeAttached();
  await expect(page.locator("#location")).toBeAttached();

  const width = await template.evaluate((element) =>
    Math.ceil(element.getBoundingClientRect().right),
  );
  expect(width).toBeLessThanOrEqual(375);

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
});
