import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const showcases = [
  {
    story: "PFP-GAL-SCG",
    route: "/template-services-catalogue",
    moduleId: "services-catalogue-gallery",
    cases: [
      ["1711401", "Composite planning result"],
      ["1711402", "Whitening planning result"],
      ["1711403", "Restorative option result"],
      ["1711404", "Preventive care result"],
    ],
    generalImages: [
      ["1711501", "A calm Morgan Dental Care treatment room"],
      ["1711502", "Morgan Dental Care reception"],
      ["1711503", "Clear consultation space"],
      ["1711504", "Care options studio"],
      ["1711505", "Morgan care collection"],
    ],
    hidden: ["Hidden catalogue result", "Unsafe catalogue image"],
  },
  {
    story: "PFP-GAL-SPA",
    route: "/template-specialist-assessment",
    moduleId: "specialist-assessment-gallery",
    cases: [
      ["1655401", "Root canal assessment result"],
      ["1655402", "Trauma review result"],
      ["1655403", "Complex care result"],
      ["1655404", "Specialist recovery result"],
    ],
    generalImages: [
      ["1655501", "A calm room for specialist consultation"],
      ["1655502", "Digital assessment planning"],
      ["1655503", "Specialist imaging review"],
      ["1655504", "Referral care workspace"],
      ["1655505", "Specialist care collection"],
    ],
    hidden: ["Hidden specialist result", "Unsafe specialist image"],
  },
  {
    story: "PFP-GAL-TFP",
    route: "/template-trust-first",
    moduleId: "trust-first-family-practice-gallery",
    cases: [
      ["1637401", "Gentle family care result"],
      ["1637402", "Confident smile result"],
      ["1637403", "Preventive family result"],
      ["1637404", "Comfort-led care result"],
    ],
    generalImages: [
      ["1637501", "A calm conversation before treatment"],
      ["1637502", "Friendly preventive guidance"],
      ["1637503", "Family welcome space"],
      ["1637504", "Comfort-focused treatment room"],
      ["1637505", "Willow family care collection"],
    ],
    hidden: ["Hidden family result", "Unsafe family image"],
  },
] as const;

for (const showcase of showcases) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    test(`${showcase.story} renders every gallery item on ${viewport.name}`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize(viewport);
      await page.goto(showcase.route);

      const gallery = page.locator(
        `[data-profile-module="${showcase.moduleId}"]`,
      );
      await gallery.scrollIntoViewIfNeeded();
      await expect(gallery).toBeVisible();
      const cases = gallery.locator('[data-gallery-kind="before-after"]');
      const generalImages = gallery.locator('[data-gallery-kind="general"]');
      await expect(cases).toHaveCount(showcase.cases.length);
      await expect(generalImages).toHaveCount(showcase.generalImages.length);

      for (const [index, [id, title]] of showcase.cases.entries()) {
        const item = cases.nth(index);
        await expect(item).toHaveAttribute("data-gallery-id", id);
        await expect(item).toHaveAttribute(
          "data-gallery-position",
          String(index + 1),
        );
        await expect(item.getByRole("heading", { name: title })).toBeVisible();
        await expect(item.getByRole("button")).toHaveCount(2);
      }
      for (const [index, [id, title]] of showcase.generalImages.entries()) {
        const item = generalImages.nth(index);
        await expect(item).toHaveAttribute("data-gallery-id", id);
        await expect(item).toHaveAttribute(
          "data-gallery-position",
          String(showcase.cases.length + index + 1),
        );
        await expect(
          item.getByRole("button", { name: `Open image for ${title}` }),
        ).toBeVisible();
      }
      for (const hidden of showcase.hidden) {
        await expect(gallery.getByText(hidden)).toHaveCount(0);
      }

      const images = gallery.locator("img");
      await expect(images).toHaveCount(
        showcase.cases.length * 2 + showcase.generalImages.length,
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

      const lastTitle = showcase.generalImages.at(-1)?.[1];
      expect(lastTitle).toBeTruthy();
      await generalImages
        .last()
        .getByRole("button", { name: `Open image for ${lastTitle}` })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("dialog").getByRole("img", { name: lastTitle }),
      ).toBeVisible();
      await page.keyboard.press("Escape");

      const scan = await new AxeBuilder({ page })
        .include(`[data-profile-module="${showcase.moduleId}"]`)
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);

      await page.reload();
      await expect(
        page.locator(
          `[data-profile-module="${showcase.moduleId}"] [data-gallery-kind="before-after"]`,
        ),
      ).toHaveCount(showcase.cases.length);
      await expect(
        page.locator(
          `[data-profile-module="${showcase.moduleId}"] [data-gallery-kind="general"]`,
        ),
      ).toHaveCount(showcase.generalImages.length);
      const overflow = await page.evaluate(() => ({
        body: document.body.scrollWidth,
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
      expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);
    });
  }
}
