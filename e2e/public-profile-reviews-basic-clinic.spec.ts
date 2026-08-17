import AxeBuilder from "@axe-core/playwright";

import { createAdminClient } from "./support/test-environment";
import { expect, test } from "./fixtures/dashboard";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const showcases = [
  {
    name: "Basic",
    route: "/template-basic",
    module: "basic-reviews",
    reviewIds: [1_511_601, 1_511_602, 1_511_603, 1_511_604],
    externalId: 1_511_701,
    externalHref: "https://example.com/dentalbio-demo/reviews",
  },
  {
    name: "Clinic and Commerce",
    route: "/template-clinic-commerce",
    module: "clinic-commerce-reviews",
    reviewIds: [1_984_201, 1_984_202, 1_984_203, 1_984_204],
    externalId: 1_984_701,
    externalHref: "https://example.com/bennett-dental/reviews",
  },
] as const;

for (const showcase of showcases) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`${showcase.name} renders every ordered review and its external destination on ${viewport.name}`, async ({
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
      await expect(
        reviewModule.getByText("Patient reviews", { exact: true }),
      ).toHaveCount(0);
      await expect(reviewModule.getByText(/^Source:/)).toHaveCount(0);

      const modifiedClickWasPrevented = await external.evaluate((link) => {
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

test("Basic keeps a safe external review destination reachable with zero cards", async ({
  dashboardPage: page,
  tenant,
}) => {
  const admin = await createAdminClient();
  const href = `https://reviews.example/${tenant.runId}`;
  const { data: externalPage, error } = await admin
    .from("external_review_pages")
    .insert({ user_id: tenant.userId, link: href })
    .select("id")
    .single();
  if (error) throw error;

  await page.goto(`/${tenant.username}`);
  const reviewModule = page.locator('[data-profile-module="basic-reviews"]');
  await expect(reviewModule).toBeVisible();
  await expect(reviewModule.locator("[data-review-id]")).toHaveCount(0);
  const external = reviewModule.locator("[data-external-review-page-id]");
  await expect(external).toHaveAttribute(
    "data-external-review-page-id",
    String(externalPage.id),
  );
  await expect(external).toHaveAttribute("href", href);
});
