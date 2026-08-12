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
      page.getByRole("img", { name: "Portrait of Dr Mila Rahman" }),
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

    for (const social of await page.locator('a[aria-label^="Open "]').all()) {
      const box = await social.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const results = page.getByRole("region", { name: "Before & after" });
    await results.scrollIntoViewIfNeeded();
    await expect(
      results.getByRole("article", {
        name: /Fictional demo case — subtle edge refinement, case 1 of 2/,
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
    await next.click();
    await expect(
      results.getByRole("article", {
        name: /Fictional demo case — natural shade change, case 2 of 2/,
      }),
    ).toBeVisible();
    await expect(previous).toBeEnabled();
    await expect(next).toBeDisabled();

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
    const selectors = [
      "#cosmetic-name",
      'a[href*="/book"]',
      "#cosmetic-signature-treatment",
      "#cosmetic-results-title",
      "#cosmetic-reviews",
      "#cosmetic-options",
      "#links",
      "#cosmetic-location",
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

  await expect(
    page.getByRole("heading", { name: "Planning and payment" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Flexible payment options" }),
  ).toHaveAttribute(
    "href",
    "https://example.com/smiles-by-mila-dentistry/payment-options",
  );

  const scan = await new AxeBuilder({ page })
    .include('[data-profile-template="cosmetic-transformation"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
