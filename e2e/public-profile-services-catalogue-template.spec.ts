import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 812 },
]) {
  test(`Services Catalogue completes discovery and booking tasks at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto("/template-services-catalogue");

    const template = page.locator(
      '[data-profile-template="services-catalogue"]',
    );
    await expect(template).toBeVisible();
    await expect(page.locator('[data-profile-theme="warm-care"]')).toHaveCount(
      1,
    );
    await expect(
      page.getByRole("heading", {
        name: "Find the right dental care without the guesswork",
        level: 1,
      }),
    ).toBeVisible();
    const heroPortrait = template
      .locator("section")
      .first()
      .getByRole("img", { name: "Portrait of Dr Elena Morgan" });
    await expect(heroPortrait).toHaveAttribute(
      "src",
      /profile-pics.*services-catalogue-profile-v2\.webp/,
    );
    await expect
      .poll(() =>
        heroPortrait.evaluate((image) =>
          image instanceof HTMLImageElement ? image.naturalWidth : 0,
        ),
      )
      .toBeGreaterThanOrEqual(1_000);

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);

    const stickyBooking = page
      .locator(".fixed.inset-x-0.bottom-0")
      .getByRole("link", { name: /Book a consultation/ });
    await expect(stickyBooking).toBeVisible();
    await expect(stickyBooking).toHaveAttribute(
      "href",
      "https://example.com/morgan-dental-care/book",
    );
    const bookingBox = await stickyBooking.boundingBox();
    expect(bookingBox).not.toBeNull();
    expect(bookingBox!.height).toBeGreaterThanOrEqual(48);
    expect(bookingBox!.x).toBeGreaterThanOrEqual(0);
    expect(bookingBox!.x + bookingBox!.width).toBeLessThanOrEqual(
      viewport.width,
    );
    expect(bookingBox!.y + bookingBox!.height).toBeLessThanOrEqual(
      viewport.height,
    );

    const featuredIds = await page
      .locator("[data-featured-treatment]")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-featured-treatment")),
      );
    expect(featuredIds).toEqual([
      "5e010000-0000-4000-8000-000000000006",
      "5e010000-0000-4000-8000-000000000009",
      "5e010000-0000-4000-8000-00000000000a",
    ]);

    const bonding = page.getByRole("button", { name: "Composite bonding" });
    await bonding.scrollIntoViewIfNeeded();
    const bondingBox = await bonding.boundingBox();
    expect(bondingBox).not.toBeNull();
    expect(bondingBox!.height).toBeGreaterThanOrEqual(44);
    await bonding.click();
    await expect(bonding).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByText(/Refine shape, symmetry, and small gaps/),
    ).toBeVisible();

    const sections = await page
      .locator("[data-practical-section]")
      .evaluateAll((elements) =>
        elements.map((element) =>
          element.getAttribute("data-practical-section"),
        ),
      );
    expect(sections).toEqual(["financing", "team", "faq"]);
    const resourceCards = page.locator("[data-practical-section] a");
    await expect(resourceCards).toHaveCount(3);
    await expect(resourceCards.nth(0)).toHaveAttribute(
      "data-link-image-variant",
      "large-image",
    );
    await expect(resourceCards.nth(1)).toHaveAttribute(
      "data-link-image-variant",
      "small-icon",
    );
    await expect(resourceCards.nth(2)).toHaveAttribute(
      "data-link-image-variant",
      "none",
    );
    const financeImage = resourceCards.nth(0).locator("img");
    const teamImage = resourceCards.nth(1).getByRole("img", {
      name: "Portrait of Dr Elena Morgan",
    });
    await expect(financeImage).toHaveAttribute(
      "src",
      /link-images.*services-catalogue-finance\.webp/,
    );
    await expect(teamImage).toHaveAttribute(
      "src",
      /profile-pics.*services-catalogue-profile-v2\.webp/,
    );
    await expect
      .poll(() =>
        financeImage.evaluate((image) =>
          image instanceof HTMLImageElement ? image.naturalWidth : 0,
        ),
      )
      .toBe(1_024);

    const blogs = template.locator(
      '[data-profile-module="services-catalogue-blogs"]',
    );
    await blogs.scrollIntoViewIfNeeded();
    await expect(blogs).toBeVisible();
    await expect(
      blogs.getByRole("heading", {
        name: "Treatment planning guides",
        level: 2,
      }),
    ).toBeVisible();
    await expect(
      blogs.getByRole("heading", { name: "Care at home", level: 2 }),
    ).toBeVisible();
    const blogLinks = blogs.getByRole("link");
    await expect(blogLinks).toHaveCount(6);
    expect(
      await blogLinks.evaluateAll((links) =>
        links.map((link) => link.getAttribute("data-blog-id")),
      ),
    ).toEqual([
      "1711901",
      "1711902",
      "1711903",
      "1711904",
      "1711905",
      "1711906",
    ]);
    await expect(blogLinks.first()).toHaveAttribute(
      "href",
      "/template-services-catalogue/blog/how-to-compare-treatment-options",
    );
    const blogImages = blogs.locator("img");
    await expect(blogImages).toHaveCount(2);
    await expect
      .poll(() =>
        blogImages.evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);
    await expect(blogs.getByText("Unpublished catalogue draft")).toHaveCount(0);
    await expect(blogs.getByText("Invalid catalogue route")).toHaveCount(0);
    await expect(
      blogs.getByText("Article in a disabled catalogue group"),
    ).toHaveCount(0);
    for (const link of await blogLinks.all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }

    const mapButton = page.getByRole("button", { name: "View map" });
    await mapButton.scrollIntoViewIfNeeded();
    await expect(mapButton).toBeVisible();
    const mapBox = await mapButton.boundingBox();
    expect(mapBox).not.toBeNull();
    expect(mapBox!.height).toBeGreaterThanOrEqual(44);

    const scan = await new AxeBuilder({ page })
      .include('[data-profile-template="services-catalogue"]')
      .withTags(WCAG_TAGS)
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}

test("Services Catalogue keeps its catalogue hierarchy and inline booking action on desktop", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/template-services-catalogue");

  await expect(
    page
      .locator("[data-profile-template='services-catalogue']")
      .getByRole("link", { name: /Book a consultation/ }),
  ).toBeVisible();
  await expect(page.locator(".fixed.inset-x-0.bottom-0")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Treatments / Services", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Treatments", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Services", level: 2 }),
  ).toBeVisible();
  await expect(
    page.locator('[data-profile-module="services-catalogue-blogs"] a'),
  ).toHaveCount(6);
});

test("every Services Catalogue blog link resolves to its owner article", async ({
  page,
}) => {
  await page.goto("/template-services-catalogue");
  const links = page
    .locator('[data-profile-module="services-catalogue-blogs"]')
    .getByRole("link");
  await expect(links).toHaveCount(6);
  const articles = await links.evaluateAll((elements) =>
    elements.map((element) => ({
      href: element.getAttribute("href"),
      title: element.textContent?.trim(),
    })),
  );

  for (const article of articles) {
    expect(article.href).toMatch(
      /^\/template-services-catalogue\/blog\/[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
    );
    expect(article.title).toBeTruthy();
    await page.goto(article.href!);
    await expect(
      page.getByRole("heading", { name: article.title!, level: 1 }),
    ).toBeVisible();
  }
});
