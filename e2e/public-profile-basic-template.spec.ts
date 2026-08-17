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
  const setupProgress = page.getByRole("region", {
    name: "Profile setup progress",
  });
  await expect(setupProgress.getByText("Basic", { exact: true })).toBeVisible();
  await expect(setupProgress.getByRole("progressbar")).toBeVisible();
  await expect(
    setupProgress.getByRole("link", { name: "Continue profile setup" }),
  ).toBeVisible();
  await expect(
    setupProgress.getByRole("link", { name: "Update template or colors" }),
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
  const linkCards = page.locator("#links [data-link-image-variant]");
  await expect(linkCards).toHaveCount(2);
  await expect(linkCards.nth(0)).toHaveAttribute(
    "data-link-image-variant",
    "small-icon",
  );
  await expect(linkCards.nth(1)).toHaveAttribute(
    "data-link-image-variant",
    "large-image",
  );
  await expect(linkCards.nth(0)).toHaveAttribute("data-link-featured", "true");
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
