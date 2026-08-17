import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const expectedArticles = [
  {
    id: "1637901",
    title: "Helping children prepare for a first visit",
    slug: "trust-first-helping-children-prepare-for-a-first-visit",
  },
  {
    id: "1637902",
    title: "What to bring to a family check-up",
    slug: "trust-first-what-to-bring-to-a-family-check-up",
  },
  {
    id: "1637903",
    title: "Making dental visits feel manageable",
    slug: "trust-first-making-dental-visits-feel-manageable",
  },
  {
    id: "1637904",
    title: "Questions to ask about family care",
    slug: "trust-first-questions-to-ask-about-family-care",
  },
  {
    id: "1637905",
    title: "Building a manageable brushing routine",
    slug: "trust-first-building-a-manageable-brushing-routine",
  },
  {
    id: "1637906",
    title: "Everyday choices for healthier smiles",
    slug: "trust-first-everyday-choices-for-healthier-smiles",
  },
] as const;

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`Trust-First exposes every enabled owner blog on ${viewport.name}`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto("/template-trust-first");

    const blogs = page.locator("#blogs");
    await blogs.scrollIntoViewIfNeeded();
    await expect(blogs).toBeVisible();
    await expect(
      blogs.getByRole("heading", {
        name: "Comfortable family visits",
        level: 3,
      }),
    ).toBeVisible();
    await expect(
      blogs.getByRole("heading", {
        name: "Healthy routines at home",
        level: 3,
      }),
    ).toBeVisible();
    await expect(blogs.getByRole("link")).toHaveCount(expectedArticles.length);

    for (const [index, article] of expectedArticles.entries()) {
      const link = blogs.getByRole("link", { name: article.title });
      await expect(link).toHaveAttribute(
        "href",
        `/template-trust-first/blog/${article.slug}`,
      );
      await expect(link).toHaveAttribute("data-blog-id", article.id);
      await expect(link).toHaveAttribute(
        "data-blog-position",
        String(index + 1),
      );
    }
    await expect(blogs.getByText("Disabled family article")).toHaveCount(0);
    await expect(
      blogs.getByText("Article in a disabled family group"),
    ).toHaveCount(0);
    await expect(blogs.locator("img")).toHaveCount(2);

    await page.reload();
    await expect(page.locator("#blogs").getByRole("link")).toHaveCount(
      expectedArticles.length,
    );
    for (const article of expectedArticles) {
      await page.goto(`/template-trust-first/blog/${article.slug}`);
      await expect(
        page.getByRole("heading", { name: article.title }),
      ).toBeVisible();
    }

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);

    await page.goto("/template-trust-first");
    const scan = await new AxeBuilder({ page })
      .include("#blogs")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}
