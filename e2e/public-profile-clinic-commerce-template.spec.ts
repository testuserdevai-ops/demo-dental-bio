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
        name: "Dr Clara Bennett",
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Professional care, in clinic and at home",
        level: 2,
      }),
    ).toBeVisible();
    const portrait = page
      .getByLabel("Dr Clara Bennett")
      .getByRole("img", { name: "Portrait of Dr Clara Bennett" });
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
    await expect(productCards).toHaveCount(4);
    expect(
      await productCards.evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-product-id")),
      ),
    ).toEqual(["1984101", "1984102", "1984103", "1984104"]);
    await expect(productCards.getByRole("heading", { level: 3 })).toHaveText([
      "Clinic care product one",
      "Clinic care product two",
      "Clinic care product three",
      "Clinic care product four",
    ]);
    expect(
      await productCards
        .getByRole("link", { name: /View product/ })
        .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
    ).toEqual([
      "https://example.com/clinic/product-one",
      "https://example.com/clinic/product-two",
      "https://example.com/clinic/product-three",
      "https://example.com/clinic/product-four",
    ]);
    const purchase = productCards.first().getByRole("link", {
      name: /View product/,
    });
    await expect(purchase).toHaveAttribute(
      "href",
      "https://example.com/clinic/product-one",
    );
    const purchaseBox = await purchase.boundingBox();
    expect(purchaseBox).not.toBeNull();
    expect(purchaseBox!.height).toBeGreaterThanOrEqual(48);
    await purchase.scrollIntoViewIfNeeded();
    await expect(purchase).toBeVisible();
    await expect(purchase).toHaveAttribute("rel", "noopener noreferrer");
    await expect(page.getByText(/may be affiliate links/i)).toHaveCount(0);
    await expect(
      page.getByText(/Product links open an external seller's website/i),
    ).toBeVisible();

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
  const template = page.locator('[data-profile-template="clinic-commerce"]');
  await expect(template).toBeVisible();
  const templateBox = await template.boundingBox();
  expect(templateBox).not.toBeNull();
  expect(templateBox!.width).toBeLessThanOrEqual(661);
  const sectionOrder = await page.locator("main").evaluate((main) => {
    const selectors = [
      "#shop",
      "#clinic",
      '[data-profile-module="videos"]',
      "#location",
      '[data-profile-module="clinic-commerce-gallery"]',
      "#blogs",
      '[data-profile-module="clinic-commerce-reviews"]',
      '[data-profile-module="clinic-commerce-links"]',
    ];
    return selectors.map((selector) => {
      const element = main.querySelector(selector);
      return element
        ? Array.from(main.querySelectorAll("*")).indexOf(element)
        : -1;
    });
  });
  expect(sectionOrder.every((position) => position >= 0)).toBe(true);
  expect(sectionOrder).toEqual([...sectionOrder].sort((a, b) => a - b));
  const socialLinks = template.locator(
    'a[aria-label="Open Instagram profile"], a[aria-label="Open Facebook profile or page"], a[aria-label="Open website"]',
  );
  await expect(socialLinks).toHaveCount(3);
  await socialLinks.first().scrollIntoViewIfNeeded();
  const socialGeometry = await socialLinks.evaluateAll((links) =>
    links.map((link) => {
      const control = link.getBoundingClientRect();
      const icon = link.querySelector("svg")?.getBoundingClientRect();
      return {
        height: control.height,
        width: control.width,
        centerDeltaX: icon
          ? Math.abs(
              control.left + control.width / 2 - (icon.left + icon.width / 2),
            )
          : Infinity,
        centerDeltaY: icon
          ? Math.abs(
              control.top + control.height / 2 - (icon.top + icon.height / 2),
            )
          : Infinity,
      };
    }),
  );
  expect(socialGeometry.length).toBeGreaterThan(0);
  expect(
    socialGeometry.every(
      ({ centerDeltaX, centerDeltaY, height, width }) =>
        height >= 44 && width >= 44 && centerDeltaX <= 1 && centerDeltaY <= 1,
    ),
  ).toBe(true);
  const scan = await new AxeBuilder({ page })
    .include('[data-profile-template="clinic-commerce"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
