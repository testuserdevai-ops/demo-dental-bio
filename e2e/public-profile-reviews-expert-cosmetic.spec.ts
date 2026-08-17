import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures/dashboard";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const showcases = [
  {
    name: "Expert and Educator",
    route: "/template-expert-educator",
    module: "expert-educator-reviews",
    reviewIds: [1_651_601, 1_651_602, 1_651_603, 1_651_604],
    externalIds: [1_651_701],
  },
  {
    name: "Cosmetic Transformation",
    route: "/template-cosmetic-results",
    module: "cosmetic-transformation-reviews",
    reviewIds: [1_641_601, 1_641_602, 1_641_603, 1_641_604],
    externalIds: [1_641_701],
  },
] as const;

for (const showcase of showcases) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`${showcase.name} renders every eligible review and external page on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(showcase.route);

      const reviewModule = page.locator(
        `[data-profile-module="${showcase.module}"]`,
      );
      await expect(reviewModule).toBeVisible();

      const cards = reviewModule.locator("[data-review-id]");
      await expect(cards).toHaveCount(showcase.reviewIds.length);
      expect(
        await cards.evaluateAll((nodes) =>
          nodes.map((node) => Number(node.getAttribute("data-review-id"))),
        ),
      ).toEqual([...showcase.reviewIds]);
      expect(
        await cards.evaluateAll((nodes) =>
          nodes.map((node) =>
            Number(node.getAttribute("data-review-position")),
          ),
        ),
      ).toEqual([1, 2, 3, 4]);

      const links = reviewModule.locator("[data-external-review-page-id]");
      await expect(links).toHaveCount(showcase.externalIds.length);
      expect(
        await links.evaluateAll((nodes) =>
          nodes.map((node) => [
            Number(node.getAttribute("data-external-review-page-id")),
            Number(node.getAttribute("data-external-review-position")),
            node.getAttribute("target"),
            node.getAttribute("rel"),
          ]),
        ),
      ).toEqual([
        [showcase.externalIds[0], 1, "_blank", "noopener noreferrer"],
      ]);

      for (const sentinel of [
        "Hidden cosmetic reviewer",
        "Null cosmetic content sentinel",
        "Invalid cosmetic score sentinel",
        "Hidden expert reviewer",
        "Null expert content sentinel",
        "Invalid expert score sentinel",
      ]) {
        await expect(
          reviewModule.getByText(sentinel, { exact: true }),
        ).toHaveCount(0);
      }
      for (const inventedHeading of [
        "Patient perspectives",
        "Reviews and independent profiles",
        "Patient experiences",
        "Feel confident in your next step",
      ]) {
        await expect(
          reviewModule.getByText(inventedHeading, { exact: true }),
        ).toHaveCount(0);
      }

      const modifiedClickWasPrevented = await links.first().evaluate((link) => {
        let preventedBeforeSafetyHandler = true;
        const stopNavigation = (event: MouseEvent) => {
          preventedBeforeSafetyHandler = event.defaultPrevented;
          event.preventDefault();
        };
        document.addEventListener("click", stopNavigation, { once: true });
        link.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            metaKey: true,
          }),
        );
        return preventedBeforeSafetyHandler;
      });
      expect(modifiedClickWasPrevented).toBe(false);

      const scan = await new AxeBuilder({ page })
        .include(`[data-profile-module="${showcase.module}"]`)
        .withTags(WCAG_TAGS)
        .analyze();
      expect(scan.violations).toEqual([]);
    });
  }
}
