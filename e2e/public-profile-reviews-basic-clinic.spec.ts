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
    externalIds: [1_511_701, 1_511_702, 1_511_703, 1_511_704],
    externalHrefs: [
      "https://example.com/dentalbio-demo/reviews",
      "https://reviews.example.net/dentalbio-demo",
      "https://feedback.example.org/dentalbio-demo",
      "https://community.example.com/dentalbio-demo/reviews",
    ],
    externalSentinelId: 1_511_791,
  },
  {
    name: "Clinic and Commerce",
    route: "/template-clinic-commerce",
    module: "clinic-commerce-reviews",
    reviewIds: [1_984_201, 1_984_202, 1_984_203, 1_984_204],
    externalIds: [1_984_701, 1_984_702, 1_984_703, 1_984_704],
    externalHrefs: [
      "https://example.com/bennett-dental/reviews",
      "https://reviews.example.net/bennett-dental",
      "https://feedback.example.org/bennett-dental",
      "https://community.example.com/bennett-dental/reviews",
    ],
    externalSentinelId: 1_984_791,
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
      await expect(external).toHaveCount(showcase.externalIds.length);
      expect(
        await external.evaluateAll((nodes) =>
          nodes.map((node) =>
            Number(node.getAttribute("data-external-review-page-id")),
          ),
        ),
      ).toEqual([...showcase.externalIds]);
      expect(
        await external.evaluateAll((nodes) =>
          nodes.map((node) =>
            Number(node.getAttribute("data-external-review-position")),
          ),
        ),
      ).toEqual([1, 2, 3, 4]);
      expect(
        await external.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("href")),
        ),
      ).toEqual([...showcase.externalHrefs]);
      for (const link of await external.all()) {
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
      await expect(
        reviewModule.locator(
          `[data-external-review-page-id="${showcase.externalSentinelId}"]`,
        ),
      ).toHaveCount(0);

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

      const modifiedClickWasPrevented = await external
        .first()
        .evaluate((link) => {
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

test("Basic keeps a dynamic external review collection reachable with zero cards", async ({
  dashboardPage: page,
  tenant,
}) => {
  test.setTimeout(90_000);
  const admin = await createAdminClient();
  const hrefs = [1, 2, 3, 4].map(
    (position) => `https://reviews${position}.example/${tenant.runId}`,
  );
  await page.goto("/onboarding/appearance?step=template");
  await page
    .getByRole("radio", { name: /^Basic/ })
    .locator("xpath=ancestor::label")
    .click();
  const templateConfirmation = page.getByRole("checkbox", {
    name: /clear the previous template setup answers/i,
  });
  if (await templateConfirmation.isVisible())
    await templateConfirmation.check();
  await page
    .getByRole("button", { name: /Save template and continue to questions/ })
    .click();
  await expect(page).toHaveURL(/template=basic/);

  await page.goto("/dashboard/review");
  const manager = page.locator('[data-testid="external-review-pages-manager"]');
  await expect(manager).toBeVisible();
  while (
    (await manager.getByRole("button", { name: /^Delete / }).count()) > 0
  ) {
    const count = await manager
      .getByRole("button", { name: /^Delete / })
      .count();
    await manager
      .getByRole("button", { name: /^Delete / })
      .first()
      .click();
    await page
      .getByRole("alertdialog", { name: "Delete external review page?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(manager.getByRole("button", { name: /^Delete / })).toHaveCount(
      count - 1,
    );
  }
  for (const href of hrefs) {
    const host = new URL(href).hostname;
    await page
      .getByRole("button", { name: "Add external review page" })
      .click();
    await page.getByLabel("External review page URL").fill(href);
    await page
      .getByRole("button", { name: "Save external review page" })
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${host}` }),
    ).toBeVisible();
  }

  const { data: externalPages, error } = await admin
    .from("external_review_pages")
    .select("id,link,rank,enabled")
    .eq("user_id", tenant.userId)
    .order("rank");
  if (error) throw error;

  await page.goto(`/${tenant.username}`);
  const reviewModule = page.locator('[data-profile-module="basic-reviews"]');
  await expect(reviewModule).toBeVisible();
  await expect(reviewModule.locator("[data-review-id]")).toHaveCount(0);
  const external = reviewModule.locator("[data-external-review-page-id]");
  await expect(external).toHaveCount(4);
  expect(
    await external.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href")),
    ),
  ).toEqual(hrefs);
  expect(
    await external.evaluateAll((nodes) =>
      nodes.map((node) =>
        Number(node.getAttribute("data-external-review-page-id")),
      ),
    ),
  ).toEqual(externalPages.filter(({ enabled }) => enabled).map(({ id }) => id));
});
