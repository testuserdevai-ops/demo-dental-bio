import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const expectedArticles = [
  {
    id: "1984401",
    title: "What to expect at a first visit",
    slug: "what-to-expect-at-a-first-visit",
  },
  {
    id: "1984402",
    title: "How preventive appointments help",
    slug: "how-preventive-appointments-help",
  },
  {
    id: "1984403",
    title: "Planning restorative care together",
    slug: "planning-restorative-care-together",
  },
  {
    id: "1984404",
    title: "Questions to bring to your appointment",
    slug: "questions-to-bring-to-your-appointment",
  },
  {
    id: "1984405",
    title: "Building a manageable brushing routine",
    slug: "building-a-manageable-brushing-routine",
  },
  {
    id: "1984406",
    title: "Choosing everyday oral care products",
    slug: "choosing-everyday-oral-care-products",
  },
] as const;

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`Clinic and Commerce exposes every enabled owner blog on ${viewport.name}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto("/template-clinic-commerce");

    const blogs = page.locator("#blogs");
    await blogs.scrollIntoViewIfNeeded();
    await expect(blogs).toBeVisible();
    await expect(
      blogs.getByRole("heading", { name: "Clinic notes", level: 2 }),
    ).toBeVisible();
    await expect(
      blogs.getByRole("heading", { name: "At-home care", level: 2 }),
    ).toBeVisible();
    await expect(blogs.getByRole("link")).toHaveCount(expectedArticles.length);

    for (const [index, article] of expectedArticles.entries()) {
      const link = blogs.getByRole("link", { name: article.title });
      await expect(link).toHaveAttribute(
        "href",
        `/template-clinic-commerce/blog/${article.slug}`,
      );
      await expect(link).toHaveAttribute("data-blog-id", article.id);
      await expect(link).toHaveAttribute(
        "data-blog-position",
        String(index + 1),
      );
    }
    await expect(blogs.getByText("Unpublished home-care draft")).toHaveCount(0);
    await expect(blogs.getByText("Article in a disabled group")).toHaveCount(0);
    const seededImages = blogs.locator("img");
    await expect(seededImages).toHaveCount(2);
    await expect(seededImages.nth(0)).toHaveAttribute(
      "src",
      "/previews/preview-1.webp",
    );
    await expect(seededImages.nth(1)).toHaveAttribute(
      "src",
      "/previews/preview-2.webp",
    );
    await expect
      .poll(() =>
        seededImages.evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);

    await page.reload();
    await expect(page.locator("#blogs").getByRole("link")).toHaveCount(
      expectedArticles.length,
    );

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);

    const scan = await new AxeBuilder({ page })
      .include("#blogs")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}
