import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const showcases = [
  {
    name: "Direct Booking",
    route: "/template-direct-booking",
    module: "direct-booking-reviews",
    reviewIds: [1_611_601, 1_611_602, 1_611_603, 1_611_604],
    externalId: 1_611_701,
    externalHref: "https://example.com/maya-patel-dentistry/reviews",
  },
  {
    name: "Location or Provider Router",
    route: "/template-location-router",
    module: "location-provider-router-reviews",
    reviewIds: [1_627_601, 1_627_602, 1_627_603, 1_627_604],
    externalId: 1_627_701,
    externalHref: "https://example.com/maya-rahman/reviews",
  },
  {
    name: "Services Catalogue",
    route: "/template-services-catalogue",
    module: "services-catalogue-reviews",
    reviewIds: [1_711_601, 1_711_602, 1_711_603, 1_711_604],
    externalId: 1_711_701,
    externalHref: "https://example.com/morgan-dental-care/reviews",
  },
  {
    name: "Specialist Assessment",
    route: "/template-specialist-assessment",
    module: "specialist-assessment-reviews",
    reviewIds: [1_655_601, 1_655_602, 1_655_603, 1_655_604],
    externalId: 1_655_701,
    externalHref: "https://example.com/amara-shah-endodontics/reviews",
  },
  {
    name: "Trust-First Family Practice",
    route: "/template-trust-first",
    module: "trust-first-family-practice-reviews",
    reviewIds: [1_637_601, 1_637_602, 1_637_603, 1_637_604],
    externalId: 1_637_701,
    externalHref: "https://example.com/willow-family-dental/reviews",
  },
] as const;

const removedTemplateCopy = [
  "Patient review summary",
  "Across our practices",
  "Patient feedback",
  "Patient perspectives",
  "Patient reviews",
  "Read all reviews",
  "Patient confidence",
  "Clear explanations from the first step",
  "Patient reassurance",
  "Families feel listened to",
  "Read more patient reviews",
];

for (const showcase of showcases) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`${showcase.name} renders every ordered review on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(showcase.route);

      const reviewModule = page.locator(
        `[data-profile-module="${showcase.module}"]`,
      );
      await expect(reviewModule).toBeVisible();
      const cards = reviewModule.locator("[data-review-id]");
      await expect(cards).toHaveCount(4);
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

      const external = reviewModule.locator("[data-external-review-page-id]");
      await expect(external).toHaveCount(1);
      await expect(external).toHaveAttribute(
        "data-external-review-page-id",
        String(showcase.externalId),
      );
      await expect(external).toHaveAttribute(
        "data-external-review-position",
        "1",
      );
      await expect(external).toHaveAttribute("href", showcase.externalHref);
      await expect(external).toHaveAttribute("target", "_blank");
      await expect(external).toHaveAttribute("rel", "noopener noreferrer");

      for (const sentinel of [
        "Hidden reviewer",
        "Null content sentinel",
        "Invalid score sentinel",
      ]) {
        await expect(
          reviewModule.getByText(sentinel, { exact: true }),
        ).toHaveCount(0);
      }
      for (const copy of removedTemplateCopy) {
        await expect(reviewModule.getByText(copy, { exact: true })).toHaveCount(
          0,
        );
      }

      const scan = await new AxeBuilder({ page })
        .include(`[data-profile-module="${showcase.module}"]`)
        .withTags(WCAG_TAGS)
        .analyze();
      expect(scan.violations).toEqual([]);
    });
  }
}
