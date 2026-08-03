import { test, expect } from "../fixtures/dashboard";

const routes = [
  ["Bio", "/dashboard"],
  ["Locations", "/dashboard/location"],
  ["Treatments / Services", "/dashboard/treatments"],
  ["Links", "/dashboard/links"],
  ["Blogs", "/dashboard/blog"],
  ["Gallery", "/dashboard/gallery"],
  ["Reviews", "/dashboard/review"],
  ["Videos", "/dashboard/video"],
  ["Shop", "/dashboard/shop"],
  ["Verification", "/dashboard/verification"],
  ["Get One Month Free", "/dashboard/referral"],
  ["Custom Domain", "/dashboard/domain"],
  ["Subscription", "/dashboard/subscription"],
  ["Settings", "/dashboard/settings"],
] as const;

test.describe("dashboard sidebar", () => {
  for (const [label, path] of routes) {
    test(`${label} is keyboard reachable and loads ${path}`, async ({ dashboardPage: page }) => {
      const link = page.getByRole("link", { name: label, exact: true });
      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}(?:\\?|$)`));
      await expect(page.locator("body")).not.toBeEmpty();
      await expect(link).toHaveAttribute("href", path);
    });
  }
});
