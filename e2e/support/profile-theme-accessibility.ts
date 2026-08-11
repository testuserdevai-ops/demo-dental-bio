import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

import type { ProfileThemeId } from "../../lib/profile-presentation/catalog";

/**
 * Shared release-gate assertion for each template/theme fixture. Template specs
 * should call this after their representative public profile is fully rendered.
 */
export async function expectAccessibleProfileTheme(
  page: Page,
  themeId: ProfileThemeId,
) {
  const root = page.locator(`[data-profile-theme="${themeId}"]`);
  await expect(root).toBeVisible();

  const variables = await root.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.getPropertyValue("--profile-page-background").trim(),
      foreground: style.getPropertyValue("--profile-text").trim(),
      primary: style.getPropertyValue("--profile-primary-action").trim(),
      focus: style.getPropertyValue("--profile-focus").trim(),
    };
  });
  expect(variables.background).toMatch(/^#[0-9a-f]{6}$/i);
  expect(variables.foreground).toMatch(/^#[0-9a-f]{6}$/i);
  expect(variables.primary).toMatch(/^#[0-9a-f]{6}$/i);
  expect(variables.focus).toMatch(/^#[0-9a-f]{6}$/i);

  const hasHorizontalPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalPageOverflow).toBe(false);

  const results = await new AxeBuilder({ page })
    .include(`[data-profile-theme="${themeId}"]`)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}
