import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const showcases = [
  {
    name: "Location Router",
    route: "/template-location-router",
    templateId: "location-provider-router",
    videoGroupIds: ["820101", "820102"],
    videoIds: ["821001", "821002", "821003", "821004"],
    productIds: ["831001", "831002", "831003", "831004"],
    locationIds: [
      "10ca7100-0000-4000-8000-000000000101",
      "10ca7100-0000-4000-8000-000000000102",
      "10ca7100-0000-4000-8000-000000000103",
    ],
    blogModule: "location-router-blogs",
    galleryModule: "location-provider-router-gallery",
    reviewModule: "location-provider-router-reviews",
    locationKind: "router",
  },
  {
    name: "Services Catalogue",
    route: "/template-services-catalogue",
    templateId: "services-catalogue",
    videoGroupIds: ["820201", "820202"],
    videoIds: ["822001", "822002", "822003", "822004"],
    productIds: ["832001", "832002", "832003", "832004"],
    locationIds: ["5e010000-0000-4000-8000-000000000003"],
    blogModule: "services-catalogue-blogs",
    galleryModule: "services-catalogue-gallery",
    reviewModule: "services-catalogue-reviews",
    locationKind: "work-location",
  },
  {
    name: "Expert Educator",
    route: "/template-expert-educator",
    templateId: "expert-educator",
    videoGroupIds: ["820301", "820302"],
    videoIds: ["823001", "823002", "823003", "823004"],
    productIds: ["833001", "833002", "833003", "833004"],
    locationIds: [
      "ed0ca700-0000-4000-8000-000000000003",
      "ed0ca700-0000-4000-8000-000000000201",
      "ed0ca700-0000-4000-8000-000000000202",
    ],
    blogModule: null,
    galleryModule: "expert-educator-gallery",
    reviewModule: "expert-educator-reviews",
    locationKind: "work-location",
  },
] as const;

async function attributes(locator: Locator, name: string) {
  return locator.evaluateAll(
    (nodes, attribute) => nodes.map((node) => node.getAttribute(attribute)),
    name,
  );
}

async function assertNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

for (const showcase of showcases) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    test(`${showcase.name} renders complete next-wave collections on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.route("https://maps.googleapis.com/**", (route) =>
        route.abort(),
      );
      await page.route("https://www.youtube.com/**", (route) => route.abort());
      await page.goto(showcase.route);

      const template = page.locator(
        `[data-profile-template="${showcase.templateId}"]`,
      );
      await expect(template).toBeVisible();

      const videoModule = template.locator('[data-profile-module="videos"]');
      const videoGroups = videoModule.locator("[data-video-group-id]");
      const videos = videoModule.locator("[data-video-id]");
      await expect(videoGroups).toHaveCount(2);
      await expect(videos).toHaveCount(4);
      expect(await attributes(videoGroups, "data-video-group-id")).toEqual(
        showcase.videoGroupIds,
      );
      expect(await attributes(videos, "data-video-id")).toEqual(
        showcase.videoIds,
      );
      expect(await attributes(videos, "data-video-position")).toEqual([
        "1",
        "2",
        "1",
        "2",
      ]);
      await expect(videoGroups.nth(0).locator("h2")).toHaveText(
        `${showcase.name} video guides`,
      );
      await expect(videoGroups.nth(1).locator("h2")).toHaveText(
        `${showcase.name} demonstrations`,
      );
      expect(await videos.getByRole("button").allTextContents()).toEqual([
        `${showcase.name} first visit guide`,
        `${showcase.name} daily care guide`,
        `${showcase.name} treatment demonstration`,
        `${showcase.name} home care demonstration`,
      ]);

      const firstVideo = videos.first().getByRole("button");
      await expect(firstVideo).toHaveAttribute("type", "button");
      await firstVideo.click();
      await expect(
        videos.first().getByRole("region", { name: /video player/ }),
      ).toBeVisible();
      await videos
        .first()
        .getByRole("button", { name: /^Close / })
        .click();
      await expect(
        videos.first().getByRole("region", { name: /video player/ }),
      ).toHaveCount(0);

      const shop = template.locator('[data-profile-module="shop"]');
      const products = shop.locator("[data-product-id]");
      await expect(products).toHaveCount(4);
      expect(await attributes(products, "data-product-id")).toEqual(
        showcase.productIds,
      );
      expect(await attributes(products, "data-product-position")).toEqual([
        "1",
        "2",
        "3",
        "4",
      ]);
      expect(await products.locator("h3").allTextContents()).toEqual([
        `${showcase.name} daily care kit`,
        `${showcase.name} travel care kit`,
        `${showcase.name} interdental care kit`,
        `${showcase.name} sensitivity care kit`,
      ]);
      const productLink = products.first().getByRole("link", {
        name: /View product/,
      });
      await expect(productLink).toHaveAttribute(
        "href",
        /^https:\/\/example\.com\/dentalbio\//,
      );
      await expect(productLink).toHaveAttribute("target", "_blank");
      await expect(productLink).toHaveAttribute("rel", "noopener noreferrer");

      for (const sentinel of [
        "sentinel video",
        "sentinel product",
        "disabled videos",
      ]) {
        await expect(template).not.toContainText(sentinel, {
          ignoreCase: true,
        });
      }

      if (showcase.locationKind === "router") {
        const options = template.locator("#location-router-selector option");
        await expect(options).toHaveCount(showcase.locationIds.length);
        expect(await attributes(options, "value")).toEqual(
          showcase.locationIds,
        );
        if (viewport.name === "desktop") {
          await template
            .locator("#location-router-selector")
            .selectOption(showcase.locationIds[1]);
          await expect(
            template.getByRole("heading", {
              name: "Hove Family Dental",
              exact: true,
            }),
          ).toBeVisible();
        }
      } else {
        const locationCards = template.locator('[id^="location-wrapper-"]');
        await expect(locationCards).toHaveCount(showcase.locationIds.length);
        expect(
          await locationCards.evaluateAll((nodes) =>
            nodes.map((node) => node.id.replace("location-wrapper-", "")),
          ),
        ).toEqual(showcase.locationIds);
        if (
          showcase.name === "Expert Educator" &&
          viewport.name === "desktop"
        ) {
          await locationCards
            .first()
            .getByRole("button", { name: "View map" })
            .click();
          await expect(page.getByRole("dialog")).toBeVisible();
          await page.getByRole("button", { name: "Done" }).click();
        }
      }

      await expect(
        template.locator(
          `[data-profile-module="${showcase.templateId}-treatment-services"]`,
        ),
      ).toBeVisible();
      await expect(
        template.locator(
          `[data-profile-module="${showcase.templateId}-links"]`,
        ),
      ).toBeVisible();
      await expect(
        template.locator(`[data-profile-module="${showcase.galleryModule}"]`),
      ).toBeVisible();
      await expect(
        template.locator(`[data-profile-module="${showcase.reviewModule}"]`),
      ).toBeVisible();
      if (showcase.blogModule) {
        await expect(
          template.locator(`[data-profile-module="${showcase.blogModule}"]`),
        ).toBeVisible();
      } else {
        await expect(template.locator("a[data-blog-id]").first()).toBeVisible();
      }

      await assertNoHorizontalOverflow(page);
      const scan = await new AxeBuilder({ page })
        .include(`[data-profile-template="${showcase.templateId}"]`)
        .withTags(WCAG_TAGS)
        .analyze();
      expect(scan.violations).toEqual([]);

      await page.reload();
      await expect(template.locator("[data-video-id]")).toHaveCount(4);
      await expect(template.locator("[data-product-id]")).toHaveCount(4);
      expect(
        new Set(
          await attributes(
            template.locator("[data-video-id]"),
            "data-video-id",
          ),
        ).size,
      ).toBe(4);
      expect(
        new Set(
          await attributes(
            template.locator("[data-product-id]"),
            "data-product-id",
          ),
        ).size,
      ).toBe(4);
      await assertNoHorizontalOverflow(page);
    });
  }
}

test("empty next-wave collections omit their sections on a controlled fixture", async ({
  page,
}) => {
  await page.goto("/template-next-wave-b-empty");
  const template = page.locator('[data-profile-template="services-catalogue"]');
  await expect(template).toBeVisible();
  await expect(template.locator('[data-profile-module="videos"]')).toHaveCount(
    0,
  );
  await expect(template.locator('[data-profile-module="shop"]')).toHaveCount(0);
});
