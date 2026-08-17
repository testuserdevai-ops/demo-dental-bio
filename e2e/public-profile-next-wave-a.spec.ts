import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
test.describe.configure({ mode: "serial" });

const showcases = [
  {
    name: "Basic",
    route: "/template-basic",
    template: "basic",
    videos: [
      {
        id: "1511101",
        title: "Patient guides",
        items: [
          {
            id: "1511201",
            title: "What to expect at your first visit",
            position: 1,
          },
          {
            id: "1511202",
            title: "Building a healthy daily routine",
            position: 2,
          },
        ],
      },
    ],
    products: [
      { id: "1511301", title: "Everyday dental care kit", position: 1 },
      { id: "1511302", title: "Whitening maintenance kit", position: 2 },
    ],
    locations: ["ba510000-0000-4000-8000-000000000003"],
    locationImages: 0,
    locationOwner: null,
    coexistence: [
      "#treatments",
      "#services",
      "#links",
      "#blog",
      "#gallery",
      "#review",
    ],
    sentinels: [] as string[],
  },
  {
    name: "Direct Booking",
    route: "/template-direct-booking",
    template: "direct-booking",
    videos: [
      {
        id: "1710101",
        title: "Direct Booking video group A",
        items: [1, 2].map((position) => ({
          id: String(1710200 + position),
          title: `Direct Booking video ${position}`,
          position,
        })),
      },
      {
        id: "1710102",
        title: "Direct Booking video group B",
        items: [3, 4].map((number) => ({
          id: String(1710200 + number),
          title: `Direct Booking video ${number}`,
          position: number - 2,
        })),
      },
    ],
    products: [1, 2, 3, 4].map((position) => ({
      id: String(1710300 + position),
      title: `Direct Booking product ${position}`,
      position,
    })),
    locations: [3, 13, 23].map(
      (suffix) => `db010000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
    ),
    locationImages: 3,
    locationOwner: {
      userId: "db010000-0000-4000-8000-000000000001",
      dentistryId: "db010000-0000-4000-8000-000000000002",
    },
    coexistence: [
      '[data-profile-module="direct-booking-treatment-services"]',
      '[data-profile-module="direct-booking-links"]',
      '[data-profile-module="direct-booking-blogs"]',
      '[data-profile-module="direct-booking-gallery"]',
      '[data-profile-module="direct-booking-reviews"]',
    ],
    sentinels: [
      190, 191, 290, 291, 292, 293, 294, 295, 296, 390, 391, 392, 393, 394,
    ].map((offset) => String(1710000 + offset)),
  },
  {
    name: "Cosmetic Transformation",
    route: "/template-cosmetic-results",
    template: "cosmetic-transformation",
    videos: [
      {
        id: "1720101",
        title: "Cosmetic Transformation video group A",
        items: [1, 2].map((position) => ({
          id: String(1720200 + position),
          title: `Cosmetic Transformation video ${position}`,
          position,
        })),
      },
      {
        id: "1720102",
        title: "Cosmetic Transformation video group B",
        items: [3, 4].map((number) => ({
          id: String(1720200 + number),
          title: `Cosmetic Transformation video ${number}`,
          position: number - 2,
        })),
      },
    ],
    products: [1, 2, 3, 4].map((position) => ({
      id: String(1720300 + position),
      title: `Cosmetic Transformation product ${position}`,
      position,
    })),
    locations: [3, 13, 23].map(
      (suffix) => `c051e71c-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
    ),
    locationImages: 3,
    locationOwner: {
      userId: "c051e71c-0000-4000-8000-000000000001",
      dentistryId: "c051e71c-0000-4000-8000-000000000002",
    },
    coexistence: [
      '[data-profile-module="cosmetic-transformation-treatment-services"]',
      "#cosmetic-results-title",
      '[data-profile-module="cosmetic-general-gallery"]',
      '[data-profile-module="cosmetic-transformation-reviews"]',
      "#links",
      '[data-profile-module="cosmetic-transformation-blogs"]',
    ],
    sentinels: [
      190, 191, 290, 291, 292, 293, 294, 295, 296, 390, 391, 392, 393, 394,
    ].map((offset) => String(1720000 + offset)),
  },
] as const;

for (const showcase of showcases) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`${showcase.name} shows its complete Batch A inventory on ${viewport.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.route("https://maps.googleapis.com/**", (route) =>
        route.abort(),
      );
      await page.goto(showcase.route);

      const template = page.locator(
        `[data-profile-template="${showcase.template}"]`,
      );
      await expect(template).toBeVisible();
      if (showcase.template === "basic") {
        await expect(
          template.getByRole("link", { name: "Shop" }),
        ).toHaveAttribute("href", "#shop");
      }

      const assertExactInventory = async (phase: "initial" | "reload") => {
        const videoGroups = template.locator("[data-video-group-id]");
        await expect(
          videoGroups,
          `${showcase.name} ${phase} video groups`,
        ).toHaveCount(showcase.videos.length);
        expect(
          await videoGroups.evaluateAll((groups) =>
            groups.map((group) => ({
              id: group.getAttribute("data-video-group-id"),
              title: group.querySelector("h2")?.textContent?.trim(),
              items: Array.from(
                group.querySelectorAll("[data-video-id]"),
                (item) => ({
                  id: item.getAttribute("data-video-id"),
                  title: item.querySelector("button")?.textContent?.trim(),
                  position: Number(item.getAttribute("data-video-position")),
                }),
              ),
            })),
          ),
        ).toEqual(showcase.videos);

        const products = template.locator("[data-product-id]");
        await expect(
          products,
          `${showcase.name} ${phase} products`,
        ).toHaveCount(showcase.products.length);
        expect(
          await products.evaluateAll((items) =>
            items.map((item) => ({
              id: item.getAttribute("data-product-id"),
              title: item.querySelector("h3")?.textContent?.trim(),
              position: Number(item.getAttribute("data-product-position")),
            })),
          ),
        ).toEqual(showcase.products);

        const locationCards = template.locator('[id^="location-wrapper-"]');
        await expect(
          locationCards,
          `${showcase.name} ${phase} locations`,
        ).toHaveCount(showcase.locations.length);
        expect(
          await locationCards.evaluateAll((items) =>
            items.map((item) => item.id.replace("location-wrapper-", "")),
          ),
        ).toEqual(showcase.locations);
        if (showcase.locationImages > 0) {
          expect(showcase.locationOwner).not.toBeNull();
          await expect(
            locationCards.locator("[data-location-image]"),
          ).toHaveCount(showcase.locationImages);
          await expect(
            locationCards.getByRole("img", {
              name: /location (1 exterior|2 consultation room)/,
            }),
          ).toHaveCount(2);
          await expect(
            locationCards.locator('[data-location-image] img[alt=""]'),
          ).toHaveCount(1);
          const locationImages = locationCards.locator(
            "[data-location-image] img",
          );
          for (let index = 0; index < showcase.locationImages; index += 1) {
            await locationImages.nth(index).scrollIntoViewIfNeeded();
          }
          await expect
            .poll(() =>
              locationImages.evaluateAll((images) =>
                images.every((image) => {
                  const element = image as HTMLImageElement;
                  return element.complete && element.naturalWidth > 0;
                }),
              ),
            )
            .toBe(true);
          const imageStates = await locationImages.evaluateAll((images) =>
            images.map((image) => {
              const element = image as HTMLImageElement;
              return {
                complete: element.complete,
                naturalWidth: element.naturalWidth,
                pathname: new URL(element.currentSrc || element.src).pathname,
              };
            }),
          );
          expect(imageStates).toEqual(
            showcase.locations.map((locationId, index) => ({
              complete: true,
              naturalWidth: expect.any(Number),
              pathname:
                `/storage/v1/object/public/location-images/${showcase.locationOwner?.userId}` +
                `/dentistries/${showcase.locationOwner?.dentistryId}/locations/${locationId}` +
                `/owner-location-${index + 1}.webp`,
            })),
          );
          for (const image of imageStates) {
            expect(image.naturalWidth).toBeGreaterThan(0);
          }
        }

        for (const sentinel of showcase.sentinels) {
          await expect(
            template.locator(
              `[data-video-group-id="${sentinel}"], [data-video-id="${sentinel}"], [data-product-id="${sentinel}"]`,
            ),
          ).toHaveCount(0);
        }
        for (const selector of showcase.coexistence) {
          await expect(
            template.locator(selector),
            `${showcase.name} retained ${selector}`,
          ).toBeAttached();
        }
        expect(
          await template
            .locator("[data-video-id]")
            .evaluateAll(
              (items) =>
                new Set(items.map((item) => item.getAttribute("data-video-id")))
                  .size,
            ),
        ).toBe(showcase.videos.flatMap(({ items }) => items).length);
        expect(
          await products.evaluateAll(
            (items) =>
              new Set(items.map((item) => item.getAttribute("data-product-id")))
                .size,
          ),
        ).toBe(showcase.products.length);
        await expect(template.locator("#shop")).toHaveCount(
          showcase.products.length > 0 ? 1 : 0,
        );
      };

      await assertExactInventory("initial");
      await page.reload();
      await assertExactInventory("reload");

      const firstVideo = showcase.videos[0].items[0];
      const videoButton = template.getByRole("button", {
        name: firstVideo.title,
      });
      await expect(videoButton).toHaveAttribute("type", "button");
      await videoButton.click();
      const player = template.getByRole("region", {
        name: `${firstVideo.title} video player`,
      });
      await expect(player).toBeVisible();
      await player
        .getByRole("button", { name: `Close ${firstVideo.title}` })
        .click();
      await expect(player).toHaveCount(0);

      const firstProduct = template.locator(
        `[data-product-id="${showcase.products[0].id}"] a`,
      );
      await expect(firstProduct).toHaveAttribute("href", /^https:\/\//);
      await expect(firstProduct).toHaveAttribute("target", "_blank");
      await expect(firstProduct).toHaveAttribute("rel", "noopener noreferrer");

      const geometry = await page.evaluate(() => ({
        body: document.body.scrollWidth,
        document: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(geometry.body).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);

      const scan = await new AxeBuilder({ page })
        .include(`[data-profile-template="${showcase.template}"]`)
        .withTags(WCAG_TAGS)
        .analyze();
      expect(scan.violations).toEqual([]);

      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath(`${showcase.template}-${viewport.name}.png`),
      });
    });
  }
}

test("Direct Booking omits empty shared video and shop sections", async ({
  page,
}) => {
  await page.goto("/template-next-wave-a-empty");
  const template = page.locator('[data-profile-template="direct-booking"]');
  await expect(template).toBeVisible();
  await expect(template.locator("[data-video-group-id]")).toHaveCount(0);
  await expect(template.locator("[data-product-id]")).toHaveCount(0);
  await expect(template.locator("#shop")).toHaveCount(0);
});
