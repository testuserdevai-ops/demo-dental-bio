import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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

test("Direct Booking keeps the booking journey compact and responsive", async ({
  page,
}) => {
  await page.goto("/template-direct-booking");

  const template = page.locator('[data-profile-template="direct-booking"]');
  await expect(template).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(
    page.locator('[data-profile-theme="modern-specialist"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Dr Maya Patel", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Portrait of Dr Maya Patel" }),
  ).toHaveAttribute("src", /profile-pics.*direct-booking-profile\.webp/);

  const booking = page.getByRole("link", { name: /Book an appointment/ });
  const website = page.getByRole("link", { name: /Visit website/ });
  await expect(booking).toHaveAttribute(
    "href",
    "https://example.com/maya-patel-dentistry/book",
  );
  await expect(booking).toHaveAttribute("target", "_blank");
  await expect(website).toHaveAttribute(
    "href",
    "https://example.com/maya-patel-dentistry",
  );
  await expect(website).toHaveAttribute("target", "_blank");

  const treatmentIds = await page
    .locator("[data-treatment-id]")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-treatment-id")),
    );
  expect(treatmentIds).toEqual([
    "db010000-0000-4000-8000-000000000007",
    "db010000-0000-4000-8000-000000000006",
    "db010000-0000-4000-8000-000000000008",
  ]);
  await expect(
    page.getByRole("heading", { name: "Maya Patel Dental Studio", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Maya Patel Dental Studio entrance" }),
  ).toHaveAttribute("src", /hero-image-3\.webp/);
  await expect(page.getByLabel("5 out of 5 stars")).toBeVisible();

  const moduleOrder = await page.locator("main").evaluate((main) => {
    const selectors = [
      "#direct-booking-name",
      '[aria-label="Appointment actions"]',
      "#direct-booking-treatments",
      "#direct-booking-location",
      '[aria-label="Patient review summary"]',
    ];
    return selectors.map((selector) => {
      const element = main.querySelector(selector);
      return element
        ? Array.from(main.querySelectorAll("*")).indexOf(element)
        : -1;
    });
  });
  expect(moduleOrder.every((position) => position >= 0)).toBe(true);
  expect(moduleOrder).toEqual([...moduleOrder].sort((a, b) => a - b));

  const desktopScan = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(booking).toBeVisible();
  await expect(website).toBeVisible();
  const mobileGeometry = await template.evaluate((element) => ({
    left: Math.floor(element.getBoundingClientRect().left),
    right: Math.ceil(element.getBoundingClientRect().right),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(mobileGeometry.left).toBeGreaterThanOrEqual(0);
  expect(mobileGeometry.right).toBeLessThanOrEqual(375);
  expect(mobileGeometry.scrollWidth).toBeLessThanOrEqual(375);
  await expect(booking).toHaveCSS("min-height", "48px");
  await expect(website).toHaveCSS("min-height", "48px");

  const mobileScan = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  expect({
    desktop: summarizeViolations(desktopScan.violations),
    mobile375: summarizeViolations(mobileScan.violations),
  }).toEqual({ desktop: [], mobile375: [] });
});
