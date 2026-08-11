import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures/dashboard";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test("location cards open a lazy, resilient map sheet on desktop and mobile", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://maps.googleapis.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/template-basic");

  const locationSection = page.locator("#location");
  await expect(locationSection).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Basic Template Dental Studio" }),
  ).toBeVisible();
  await expect(page.locator('script[src*="maps.googleapis.com"]')).toHaveCount(
    0,
  );

  const openMap = page.getByRole("button", { name: "View map" });
  await openMap.click();
  const dialog = page.getByRole("dialog", {
    name: "Basic Template Dental Studio",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("12 Demo Street", { exact: false }),
  ).toBeVisible();
  await expect(dialog.locator("[data-map-status]")).toBeVisible();

  const directions = dialog.getByRole("link", { name: /Get directions/ });
  await expect(directions).toHaveAttribute(
    "href",
    /https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=51\.5202%2C-0\.1549/,
  );
  await expect(directions).toHaveAttribute("target", "_blank");
  await expect(directions).toHaveAttribute("rel", "noopener noreferrer");
  await expect(
    dialog.getByRole("link", { name: "Call practice" }),
  ).toHaveAttribute("href", /^tel:/);
  await expect(
    dialog.getByRole("link", { name: "Email practice" }),
  ).toHaveAttribute("href", /^mailto:/);

  const desktopBox = await dialog.boundingBox();
  expect(desktopBox).not.toBeNull();
  expect(
    Math.abs(desktopBox!.y + desktopBox!.height / 2 - 720 / 2),
  ).toBeLessThanOrEqual(2);
  expect(desktopBox!.y).toBeGreaterThan(0);
  expect(desktopBox!.y + desktopBox!.height).toBeLessThan(720);
  const desktopOverflow = await dialog.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(desktopOverflow.scrollHeight).toBeLessThanOrEqual(
    desktopOverflow.clientHeight + 1,
  );
  const doneBox = await dialog
    .getByRole("button", { name: "Done" })
    .boundingBox();
  expect(doneBox).not.toBeNull();
  expect(doneBox!.y + doneBox!.height).toBeLessThanOrEqual(
    desktopBox!.y + desktopBox!.height,
  );

  const desktopAxe = await new AxeBuilder({ page })
    .include("#location")
    .withTags(WCAG_TAGS)
    .analyze();
  expect(desktopAxe.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(openMap).toBeFocused();

  await page.setViewportSize({ width: 375, height: 812 });
  await openMap.click();
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(Math.ceil(dialogBox!.width)).toBeLessThanOrEqual(375);
  expect(Math.abs(dialogBox!.y + dialogBox!.height - 812)).toBeLessThanOrEqual(
    2,
  );
  await expect(
    dialog.getByRole("link", { name: /Get directions/ }),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Done" })).toBeVisible();

  const mobileAxe = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(WCAG_TAGS)
    .analyze();
  expect(mobileAxe.violations).toEqual([]);
});
