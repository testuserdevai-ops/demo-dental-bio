import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures/dashboard";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

function summarizeViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    nodeCount: nodes.length,
  }));
}

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

  const desktopScan = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  await page.setViewportSize({ width: 375, height: 812 });

  const width = await template.evaluate((element) =>
    Math.ceil(element.getBoundingClientRect().right),
  );
  expect(width).toBeLessThanOrEqual(375);

  const mobileScan = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  expect({
    desktop: summarizeViolations(desktopScan.violations),
    mobile375: summarizeViolations(mobileScan.violations),
  }).toEqual({ desktop: [], mobile375: [] });
});
