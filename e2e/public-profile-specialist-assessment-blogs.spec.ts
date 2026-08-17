import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const expectedArticles = [
  {
    id: "1655901",
    title: "Preparing for a specialist assessment",
    slug: "preparing-for-a-specialist-assessment",
  },
  {
    id: "1655902",
    title: "Questions to bring to your visit",
    slug: "questions-to-bring-to-your-visit",
  },
  {
    id: "1655903",
    title: "Sending helpful records securely",
    slug: "sending-helpful-records-securely",
  },
  {
    id: "1655904",
    title: "What happens at a first specialist visit",
    slug: "what-happens-at-a-first-specialist-visit",
  },
  {
    id: "1655905",
    title: "Understanding your referral",
    slug: "understanding-your-referral",
  },
  {
    id: "1655906",
    title: "Planning follow-up care together",
    slug: "planning-follow-up-care-together",
  },
] as const;

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`Specialist Assessment exposes every enabled owner blog on ${viewport.name}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto("/template-specialist-assessment");

    const blogs = page.locator("#blogs");
    await blogs.scrollIntoViewIfNeeded();
    await expect(blogs).toBeVisible();
    await expect(
      blogs.getByRole("heading", {
        name: "Preparing for assessment",
        level: 3,
      }),
    ).toBeVisible();
    await expect(
      blogs.getByRole("heading", {
        name: "After your assessment",
        level: 3,
      }),
    ).toBeVisible();
    await expect(blogs.getByRole("link")).toHaveCount(expectedArticles.length);

    for (const [index, article] of expectedArticles.entries()) {
      const link = blogs.getByRole("link", { name: article.title });
      await expect(link).toHaveAttribute(
        "href",
        `/template-specialist-assessment/blog/${article.slug}`,
      );
      await expect(link).toHaveAttribute("data-blog-id", article.id);
      await expect(link).toHaveAttribute(
        "data-blog-position",
        String(index + 1),
      );
    }
    await expect(blogs.getByText("Disabled specialist article")).toHaveCount(0);
    await expect(
      blogs.getByText("Article in a disabled specialist group"),
    ).toHaveCount(0);
    const seededImages = blogs.locator("img");
    await expect(seededImages).toHaveCount(2);
    await expect(seededImages.nth(0)).toHaveAttribute(
      "src",
      /\/previews\/preview-1\.webp$/,
    );
    await expect(seededImages.nth(1)).toHaveAttribute(
      "src",
      /\/previews\/preview-2\.webp$/,
    );

    await page.reload();
    await expect(page.locator("#blogs").getByRole("link")).toHaveCount(
      expectedArticles.length,
    );
    for (const article of expectedArticles) {
      await page.goto(`/template-specialist-assessment/blog/${article.slug}`);
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

    await page.goto("/template-specialist-assessment");
    const scan = await new AxeBuilder({ page })
      .include("#blogs")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}
