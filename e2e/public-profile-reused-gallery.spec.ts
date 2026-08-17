import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const showcases = [
  {
    story: "PFP-GAL-DBK",
    label: "Direct Booking",
    route: "/template-direct-booking",
    moduleId: "direct-booking-gallery",
    cases: [
      ["1611401", "Composite appointment result"],
      ["1611402", "Whitening appointment result"],
      ["1611403", "Restorative care result"],
      ["1611404", "Everyday confidence result"],
    ],
    generalImages: [
      ["1611501", "Maya Patel Dental Studio entrance"],
      ["1611502", "Calm appointment room"],
      ["1611503", "Welcoming care team"],
      ["1611504", "Comfort-focused treatment space"],
      ["1611505", "Appointment care collection"],
    ],
    hidden: [
      "Hidden booking result",
      "Hidden booking image",
      "Unsafe booking image",
    ],
  },
  {
    story: "PFP-GAL-EED",
    label: "Expert and Educator",
    route: "/template-expert-educator",
    moduleId: "expert-educator-gallery",
    cases: [
      ["1651401", "Composite teaching case"],
      ["1651402", "Whitening teaching case"],
      ["1651403", "Restorative review case"],
      ["1651404", "Evidence-led care result"],
    ],
    generalImages: [
      ["1651501", "A calm conversation before treatment"],
      ["1651502", "Friendly preventive guidance"],
      ["1651503", "Restorative teaching workshop"],
      ["1651504", "Clinical learning space"],
      ["1651505", "Evidence and education collection"],
    ],
    hidden: [
      "Hidden teaching case",
      "Hidden educator image",
      "Unsafe educator image",
    ],
  },
  {
    story: "PFP-GAL-LPR",
    label: "Location or Provider Router",
    route: "/template-location-router",
    moduleId: "location-provider-router-gallery",
    cases: [
      ["1627401", "Composite care result"],
      ["1627402", "Whitening care result"],
      ["1627403", "Restorative care review"],
      ["1627404", "Connected care result"],
    ],
    generalImages: [
      ["1627501", "Welcoming reception"],
      ["1627502", "Modern treatment room"],
      ["1627503", "Friendly care team"],
      ["1627504", "Comfort-focused practice space"],
      ["1627505", "Connected practice collection"],
    ],
    hidden: [
      "Hidden router result",
      "Hidden router image",
      "Unsafe router image",
    ],
  },
] as const;

for (const showcase of showcases) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    test(`${showcase.story} exposes every eligible gallery item on ${viewport.name}`, async ({
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

      const scan = await new AxeBuilder({ page })
        .include(`[data-profile-module="${showcase.moduleId}"]`)
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    });
  }
}
