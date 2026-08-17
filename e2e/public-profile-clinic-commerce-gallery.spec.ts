import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const expectedCases = [
  ["1984501", "Composite edge refinement"],
  ["1984502", "Whitening plan result"],
  ["1984503", "Restorative smile review"],
  ["1984504", "Everyday confidence result"],
] as const;
const expectedGeneralImages = [
  ["1984601", "A calm consultation room"],
  ["1984602", "The Bennett Dental Studio team"],
  ["1984603", "Modern preventive care"],
  ["1984604", "Comfort-focused treatment space"],
  ["1984605", "Clinic and home-care collection"],
] as const;

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`Clinic and Commerce exposes every eligible gallery item on ${viewport.name}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto("/template-clinic-commerce");

    const gallery = page.getByRole("region", { name: "Gallery" });
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery).toBeVisible();
    const cases = gallery.locator('[data-gallery-kind="before-after"]');
    const generalImages = gallery.locator('[data-gallery-kind="general"]');
    await expect(cases).toHaveCount(expectedCases.length);
    await expect(generalImages).toHaveCount(expectedGeneralImages.length);

    for (const [index, [id, title]] of expectedCases.entries()) {
      const item = cases.nth(index);
      await expect(item).toHaveAttribute("data-gallery-id", id);
      await expect(item).toHaveAttribute(
        "data-gallery-position",
        String(index + 1),
      );
      await expect(item.getByRole("heading", { name: title })).toBeVisible();
      await expect(item.getByRole("button")).toHaveCount(2);
    }
    for (const [index, [id, title]] of expectedGeneralImages.entries()) {
      const item = generalImages.nth(index);
      await expect(item).toHaveAttribute("data-gallery-id", id);
      await expect(item).toHaveAttribute(
        "data-gallery-position",
        String(expectedCases.length + index + 1),
      );
      await expect(
        item.getByRole("button", {
          name: `Open gallery image for ${title}`,
        }),
      ).toBeVisible();
    }
    await expect(gallery.getByText("Hidden comparison")).toHaveCount(0);
    await expect(gallery.getByText("Hidden studio image")).toHaveCount(0);
    await expect(gallery.getByText("Unsafe studio image")).toHaveCount(0);

    const images = gallery.locator("img");
    await expect(images).toHaveCount(
      expectedCases.length * 2 + expectedGeneralImages.length,
    );
    await expect
      .poll(() =>
        images.evaluateAll((items) =>
          items.every(
            (item) =>
              item instanceof HTMLImageElement &&
              item.complete &&
              item.naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);

    await generalImages
      .last()
      .getByRole("button", {
        name: "Open gallery image for Clinic and home-care collection",
      })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("dialog").getByRole("img", {
        name: "Clinic and home-care collection",
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.reload();
    await expect(
      page.locator('#gallery [data-gallery-kind="before-after"]'),
    ).toHaveCount(expectedCases.length);
    await expect(
      page.locator('#gallery [data-gallery-kind="general"]'),
    ).toHaveCount(expectedGeneralImages.length);

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);

    const scan = await new AxeBuilder({ page })
      .include("#gallery")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}
