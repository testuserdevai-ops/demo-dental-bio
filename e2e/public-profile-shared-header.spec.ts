import { expect, test } from "@playwright/test";

const templates = [
  ["/template-basic", "basic"],
  ["/template-direct-booking", "direct-booking"],
  ["/template-location-router", "location-provider-router"],
  ["/template-services-catalogue", "services-catalogue"],
  ["/template-cosmetic-results", "cosmetic-transformation"],
  ["/template-trust-first", "trust-first-family-practice"],
  ["/template-specialist-assessment", "specialist-assessment"],
  ["/template-expert-educator", "expert-educator"],
  ["/template-clinic-commerce", "clinic-commerce"],
] as const;

for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 812 },
]) {
  test(`keeps one themed sticky identity header across all templates at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);

    for (const [route, templateId] of templates) {
      await page.goto(route);
      const header = page.locator('[data-profile-header="true"]');
      await expect(header).toHaveCount(1);
      await expect(header).toHaveAttribute(
        "data-profile-header-template",
        templateId,
      );
      await expect(
        header.getByRole("button", { name: "Share profile" }),
      ).toBeVisible();
      await expect(header.locator("a").first()).toBeVisible();

      const initial = await header.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const portrait = element.querySelector("img")?.getBoundingClientRect();
        const action = element.querySelector("a")?.getBoundingClientRect();
        const share = element
          .querySelector('button[aria-label="Share profile"]')
          ?.getBoundingClientRect();
        return {
          top: rect.top,
          height: rect.height,
          portraitWidth: portrait?.width ?? 0,
          actionHeight: action?.height ?? 0,
          shareHeight: share?.height ?? 0,
        };
      });
      expect(initial.top).toBe(0);
      expect(initial.height).toBeLessThanOrEqual(80);
      expect(initial.portraitWidth).toBeLessThan(1);
      expect(initial.actionHeight).toBeGreaterThanOrEqual(44);
      expect(initial.shareHeight).toBeGreaterThanOrEqual(44);

      await page.evaluate(() => window.scrollTo(0, 450));
      await expect(header).toHaveAttribute(
        "data-profile-header-scrolled",
        "true",
      );
      const compact = await header.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const portrait = element.querySelector("img")?.getBoundingClientRect();
        return {
          top: rect.top,
          portraitWidth: portrait?.width ?? 0,
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        };
      });
      expect(compact.top).toBe(0);
      expect(compact.portraitWidth).toBeGreaterThanOrEqual(40);
      expect(compact.overflow).toBe(0);
    }
  });
}
