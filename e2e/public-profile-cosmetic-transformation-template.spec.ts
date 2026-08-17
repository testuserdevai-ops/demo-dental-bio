import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const mobileViewports = [
  { width: 390, height: 844 },
  { width: 375, height: 812 },
];

test("Cosmetic Transformation keeps consultation and result browsing usable on mobile", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://maps.googleapis.com/**", (route) => route.abort());

  for (const viewport of mobileViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/template-cosmetic-results");

    const template = page.locator(
      '[data-profile-template="cosmetic-transformation"]',
    );
    await expect(template).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);
    await expect(
      page.locator('[data-profile-theme="premium-contrast"]'),
    ).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Dr Mila Rahman", level: 1 }),
    ).toBeVisible();
    await expect(
      template.getByRole("img", { name: "Portrait of Dr Mila Rahman" }),
    ).toHaveAttribute("src", /cosmetic-results-profile\.webp/);

    const consultation = page.getByRole("link", {
      name: /Book a free consultation/,
    });
    await expect(consultation).toBeVisible();
    await expect(consultation).toHaveAttribute(
      "href",
      "https://example.com/smiles-by-mila-dentistry/book",
    );

    const initialGeometry = await page.evaluate(() => {
      const template = document.querySelector(
        '[data-profile-template="cosmetic-transformation"]',
      );
      const cta = Array.from(document.querySelectorAll("a")).find((link) =>
        link.textContent?.includes("Book a free consultation"),
      );
      if (!template || !cta) return null;
      const templateRect = template.getBoundingClientRect();
      const ctaRect = cta.getBoundingClientRect();
      const hit = document.elementFromPoint(
        ctaRect.left + ctaRect.width / 2,
        ctaRect.top + ctaRect.height / 2,
      );
      return {
        bodyWidth: document.body.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        templateLeft: Math.floor(templateRect.left),
        templateRight: Math.ceil(templateRect.right),
        ctaHeight: ctaRect.height,
        ctaBottom: ctaRect.bottom,
        ctaUnobscured: hit === cta || Boolean(hit && cta.contains(hit)),
        maxWidth: Number.parseFloat(getComputedStyle(template).maxWidth),
      };
    });
    expect(initialGeometry).not.toBeNull();
    expect(initialGeometry?.bodyWidth).toBeLessThanOrEqual(viewport.width);
    expect(initialGeometry?.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(initialGeometry?.templateLeft).toBeGreaterThanOrEqual(0);
    expect(initialGeometry?.templateRight).toBeLessThanOrEqual(viewport.width);
    expect(initialGeometry?.ctaHeight).toBeGreaterThanOrEqual(48);
    expect(initialGeometry?.ctaBottom).toBeLessThan(viewport.height);
    expect(initialGeometry?.ctaUnobscured).toBe(true);
    expect(initialGeometry?.maxWidth).toBe(661);

    for (const social of await template
      .locator('a[aria-label^="Open "]')
      .all()) {
      const box = await social.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const results = page.getByRole("region", { name: "Before & after" });
    await results.scrollIntoViewIfNeeded();
    await expect(
      results.getByRole("article", {
        name: /Fictional demo case — subtle edge refinement, case 1 of 8/,
      }),
    ).toBeVisible();
    await expect(
      results.getByRole("img", {
        name: /Before — fictional demo: Fictional demo case/,
      }),
    ).toHaveAttribute("src", /cosmetic-case-bonding-before\.webp/);
    await expect(
      results.getByRole("img", {
        name: /After — fictional demo: Fictional demo case/,
      }),
    ).toHaveAttribute("src", /cosmetic-case-bonding-after\.webp/);

    const next = results.getByRole("button", { name: "Next result" });
    const previous = results.getByRole("button", { name: "Previous" });
    for (const control of [previous, next]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(48);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
    await expect(previous).toBeDisabled();
    const visibleCaseIds = [
      await results.getByRole("article").getAttribute("data-gallery-id"),
    ];
    for (let index = 2; index <= 8; index += 1) {
      await next.click();
      const active = results.getByRole("article", {
        name: new RegExp(`case ${index} of 8`),
      });
      await expect(active).toBeVisible();
      visibleCaseIds.push(await active.getAttribute("data-gallery-id"));
    }
    expect(visibleCaseIds).toEqual(
      Array.from({ length: 8 }, (_, index) => String(1_641_401 + index)),
    );
    await expect(previous).toBeEnabled();
    await expect(next).toBeDisabled();
    await expect(results.getByText("Disabled gallery sentinel")).toHaveCount(0);
    await expect(results.getByText("Incomplete gallery sentinel")).toHaveCount(
      0,
    );

    const generalGallery = page.locator(
      '[data-profile-module="cosmetic-general-gallery"]',
    );
    await generalGallery.scrollIntoViewIfNeeded();
    await expect(generalGallery).toBeVisible();
    const generalItems = generalGallery.locator("[data-general-gallery-id]");
    await expect(generalItems).toHaveCount(4);
    expect(
      await generalItems.evaluateAll((items) =>
        items.map((item) => item.getAttribute("data-general-gallery-id")),
      ),
    ).toEqual(["1641501", "1641502", "1641503", "1641504"]);
    await expect
      .poll(() =>
        generalGallery
          .locator("img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await expect(
      template.getByRole("img", {
        name: "A calm consultation at Mila Rahman Smile Studio",
      }),
    ).toHaveCount(2);
    await expect(
      generalGallery.getByText("Disabled general gallery sentinel"),
    ).toHaveCount(0);
    const galleryButtons = generalGallery.getByRole("button", {
      name: /^Open /,
    });
    await expect(galleryButtons).toHaveCount(4);
    for (const button of await galleryButtons.all()) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
    const openedImage = galleryButtons.nth(2);
    await openedImage.click();
    const galleryDialog = page.getByRole("dialog", {
      name: "A considered treatment planning space",
    });
    await expect(galleryDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(openedImage).toBeFocused();

    const blogs = page.locator(
      '[data-profile-module="cosmetic-transformation-blogs"]',
    );
    await blogs.scrollIntoViewIfNeeded();
    await expect(blogs).toBeVisible();
    await expect(
      blogs.getByRole("heading", { name: "Smile planning", level: 2 }),
    ).toBeVisible();
    await expect(
      blogs.getByRole("heading", { name: "Treatment guides", level: 2 }),
    ).toBeVisible();
    const blogLinks = blogs.getByRole("link");
    await expect(blogLinks).toHaveCount(6);
    await expect(blogLinks).toHaveText([
      "What happens at a smile consultation",
      "Planning a natural-looking result",
      "Questions to ask before treatment",
      "Understanding your treatment timeline",
      "A guide to composite bonding",
      "Caring for your smile after treatment",
    ]);
    const blogImages = blogs.locator("img");
    await expect(blogImages).toHaveCount(2);
    await expect(blogImages.nth(0)).toHaveAttribute("src", /preview-1\.webp/);
    await expect(blogImages.nth(1)).toHaveAttribute("src", /preview-2\.webp/);
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
    await expect(blogLinks.first()).toHaveAttribute(
      "href",
      "/template-cosmetic-results/blog/cosmetic-smile-consultation",
    );
    await expect(blogs.getByText("Disabled cosmetic article")).toHaveCount(0);
    await expect(blogs.getByText("Invalid cosmetic route")).toHaveCount(0);
    await expect(
      blogs.getByText("Article in a blank cosmetic group"),
    ).toHaveCount(0);
    for (const link of await blogLinks.all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }

    const openMap = page.getByRole("button", { name: "View map" });
    await openMap.scrollIntoViewIfNeeded();
    await expect(openMap).toBeVisible();
    await openMap.click();
    const dialog = page.getByRole("dialog", {
      name: "Mila Rahman Smile Studio",
    });
    await expect(dialog).toBeVisible();
    const done = dialog.getByRole("button", { name: "Done" });
    await done.scrollIntoViewIfNeeded();
    await expect(done).toBeVisible();
    await done.click();
    await expect(openMap).toBeFocused();
  }
});

test("Cosmetic Transformation keeps its results-led order on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/template-cosmetic-results");

  const moduleOrder = await page.locator("main").evaluate((main) => {
    const orderedElements = [
      "#cosmetic-name",
      'a[href*="/book"]',
      "#cosmetic-signature-treatment",
      "#cosmetic-results-title",
      '[data-profile-module="cosmetic-general-gallery"]',
      "#cosmetic-reviews",
      "#links",
      "#blogs",
      "#cosmetic-location",
    ].map((selector) => main.querySelector(selector));
    const treatmentOptions = Array.from(main.querySelectorAll("article")).find(
      (article) =>
        article.querySelector("h3")?.textContent?.trim() === "Clear aligners",
    );
    orderedElements.splice(6, 0, treatmentOptions ?? null);
    return orderedElements.map((element) => {
      return element
        ? Array.from(main.querySelectorAll("*")).indexOf(element)
        : -1;
    });
  });
  expect(moduleOrder.every((position) => position >= 0)).toBe(true);
  expect(moduleOrder).toEqual([...moduleOrder].sort((a, b) => a - b));

  await expect(
    page.getByRole("heading", { name: "Planning and payment" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Flexible payment options" }),
  ).toHaveAttribute(
    "href",
    "https://example.com/smiles-by-mila-dentistry/payment-options",
  );

  const blogLinks = page
    .locator('[data-profile-module="cosmetic-transformation-blogs"]')
    .getByRole("link");
  await expect(blogLinks).toHaveCount(6);
  const firstBlogBox = await blogLinks.first().boundingBox();
  const secondBlogBox = await blogLinks.nth(1).boundingBox();
  expect(firstBlogBox).not.toBeNull();
  expect(secondBlogBox).not.toBeNull();
  expect(Math.abs(firstBlogBox!.y - secondBlogBox!.y)).toBeLessThanOrEqual(2);
  expect(firstBlogBox!.width).toBeGreaterThan(240);

  const scan = await new AxeBuilder({ page })
    .include('[data-profile-template="cosmetic-transformation"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("every Cosmetic Transformation blog link resolves to its owner article", async ({
  page,
}) => {
  await page.goto("/template-cosmetic-results");
  const links = page
    .locator('[data-profile-module="cosmetic-transformation-blogs"]')
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
      /^\/template-cosmetic-results\/blog\/[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
    );
    expect(article.title).toBeTruthy();
    await page.goto(article.href!);
    await expect(
      page.getByRole("heading", { name: article.title!, level: 1 }),
    ).toBeVisible();
  }
});
