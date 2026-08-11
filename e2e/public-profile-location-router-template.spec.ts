import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures/dashboard";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test("location router completes selection, map, and contact tasks on a narrow screen", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://maps.googleapis.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/template-location-router");

  const template = page.locator(
    '[data-profile-template="location-provider-router"]',
  );
  await expect(template).toBeVisible();
  await expect(page.locator('[data-profile-theme="warm-care"]')).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Dr Maya Rahman", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Portrait of Dr Maya Rahman" }),
  ).toHaveAttribute("src", /location-router-profile\.webp/);
  await expect(
    page.getByRole("group", { name: "Practice gallery" }).getByRole("img"),
  ).toHaveCount(3);

  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);

  const selector = page.getByRole("combobox", { name: "Practice location" });
  await expect(selector).toBeVisible();
  const selectorBox = await selector.boundingBox();
  expect(selectorBox).not.toBeNull();
  expect(selectorBox!.height).toBeGreaterThanOrEqual(44);
  expect(selectorBox!.y).toBeLessThan(812 * 2);
  await expect(selector).toHaveValue("10ca7100-0000-4000-8000-000000000101");
  await expect(
    page.getByRole("heading", { name: "Harbour Dental Studio" }),
  ).toBeVisible();

  await selector.selectOption("10ca7100-0000-4000-8000-000000000102");
  await expect(
    page.getByRole("heading", { name: "Hove Family Dental" }),
  ).toBeVisible();
  await expect(page.getByText("42 Church Road, Hove BN3 2FN")).toBeVisible();

  const booking = page.getByRole("link", {
    name: /Book at Hove Family Dental/,
  });
  const openMap = page.getByRole("button", { name: "View map" });
  const call = page.getByRole("link", { name: "Call this practice" });
  const email = page.getByRole("link", { name: "Email this practice" });
  for (const control of [booking, openMap, call, email]) {
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  }
  await expect(booking).toHaveAttribute(
    "href",
    "https://example.com/maya-rahman/book",
  );
  await expect(call).toHaveAttribute("href", "tel:+441273000123");
  await expect(email).toHaveAttribute("href", "mailto:care@example.com");

  await openMap.click();
  const dialog = page.getByRole("dialog", { name: "Hove Family Dental" });
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.width).toBeLessThanOrEqual(375);
  expect(Math.abs(dialogBox!.y + dialogBox!.height - 812)).toBeLessThanOrEqual(
    2,
  );
  await expect(
    dialog.getByRole("link", { name: /Get directions/ }),
  ).toBeVisible();
  const done = dialog.getByRole("button", { name: "Done" });
  await done.scrollIntoViewIfNeeded();
  await expect(done).toBeVisible();
  await done.click();
  await expect(dialog).toBeHidden();
  await expect(openMap).toBeFocused();

  const otherPractice = page.getByRole("button", {
    name: /North Laine Care Hub/,
  });
  await otherPractice.scrollIntoViewIfNeeded();
  const otherBox = await otherPractice.boundingBox();
  expect(otherBox).not.toBeNull();
  expect(otherBox!.height).toBeGreaterThanOrEqual(44);
  await otherPractice.click();
  await expect(
    page.getByRole("heading", { name: "North Laine Care Hub" }),
  ).toBeVisible();
  await expect(selector).toHaveValue("10ca7100-0000-4000-8000-000000000103");

  const mobileAxe = await new AxeBuilder({ page })
    .include('[data-profile-template="location-provider-router"]')
    .withTags(WCAG_TAGS)
    .analyze();
  expect(mobileAxe.violations).toEqual([]);
});

test("location router keeps its hierarchy and modal reachable on desktop", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://maps.googleapis.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/template-location-router");

  const selector = page.getByRole("combobox", { name: "Practice location" });
  await selector.selectOption("10ca7100-0000-4000-8000-000000000102");
  const openMap = page.getByRole("button", { name: "View map" });
  await openMap.scrollIntoViewIfNeeded();
  await openMap.click();

  const dialog = page.getByRole("dialog", { name: "Hove Family Dental" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThan(0);
  expect(box!.y + box!.height).toBeLessThan(720);
  await expect(dialog.getByRole("button", { name: "Done" })).toBeVisible();
});
