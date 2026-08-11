import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 812 },
]) {
  test(`Clinic and Commerce keeps booking and shopping completable at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto("/template-clinic-commerce");

    const template = page.locator('[data-profile-template="clinic-commerce"]');
    await expect(template).toBeVisible();
    await expect(
      page.locator('[data-profile-theme="editorial-expert"]'),
    ).toHaveCount(1);
    await expect(
      page.getByRole("heading", {
        name: "Professional care, in clinic and at home",
        level: 1,
      }),
    ).toBeVisible();
    const portrait = page.getByRole("img", {
      name: "Portrait of Dr Clara Bennett",
    });
    await expect(portrait).toHaveAttribute(
      "src",
      /profile-pics.*clinic-commerce-profile\.webp/,
    );
    await expect
      .poll(() =>
        portrait.evaluate((image) =>
          image instanceof HTMLImageElement ? image.naturalWidth : 0,
        ),
      )
      .toBeGreaterThanOrEqual(1_000);

    const clinic = page.getByRole("link", { name: /Book the clinic/ }).first();
    const shop = page.getByRole("link", { name: "Browse the shop" });
    for (const action of [clinic, shop]) {
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(48);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThan(viewport.height);
      const unobscured = await action.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        return hit === element || Boolean(hit && element.contains(hit));
      });
      expect(unobscured).toBe(true);
    }
    await expect(clinic).toHaveAttribute(
      "href",
      "https://example.com/bennett-dental/book",
    );
    await expect(shop).toHaveAttribute("href", "#shop");

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);

    await shop.click();
    await expect(page.locator("#shop")).toBeInViewport();
    const productCards = page.locator("[data-product-id]");
    await expect(productCards).toHaveCount(3);
    await expect(productCards.first()).toHaveAttribute(
      "data-product-id",
      "1984101",
    );
    const productImage = productCards
      .first()
      .getByRole("img", { name: "Electric brush travel set" });
    await expect(productImage).toHaveAttribute(
      "src",
      /product-images.*electric-travel-set\.webp/,
    );
    const purchase = productCards.first().getByRole("link", {
      name: /View product/,
    });
    await expect(purchase).toHaveAttribute(
      "href",
      "https://example.com/bennett-dental/shop/electric-travel-set",
    );
    const purchaseBox = await purchase.boundingBox();
    expect(purchaseBox).not.toBeNull();
    expect(purchaseBox!.height).toBeGreaterThanOrEqual(48);
    await purchase.scrollIntoViewIfNeeded();
    await expect(purchase).toBeVisible();

    const clinicSection = page.locator("#clinic");
    await clinicSection.scrollIntoViewIfNeeded();
    await expect(clinicSection).toBeInViewport();
    await expect(
      clinicSection.getByRole("heading", { name: "New patient consultation" }),
    ).toBeVisible();
    const laterBooking = clinicSection.getByRole("link", {
      name: /Book the clinic/,
    });
    await expect(laterBooking).toBeVisible();
    expect((await laterBooking.boundingBox())!.height).toBeGreaterThanOrEqual(
      48,
    );
  });
}

test("Clinic and Commerce keeps its audience-led order and secondary axe regression clean", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/template-clinic-commerce");
  const sectionOrder = await page.locator("main").evaluate((main) => {
    const shop = main.querySelector<HTMLElement>("#shop");
    const clinic = main.querySelector<HTMLElement>("#clinic");
    return shop && clinic
      ? Array.from(main.querySelectorAll("section")).indexOf(shop) <
          Array.from(main.querySelectorAll("section")).indexOf(clinic)
      : false;
  });
  expect(sectionOrder).toBe(true);
  const scan = await new AxeBuilder({ page })
    .include('[data-profile-template="clinic-commerce"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
