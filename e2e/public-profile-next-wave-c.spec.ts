import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const SHOWCASES = [
  {
    name: "Clinic Commerce",
    route: "/template-clinic-commerce",
    locations: [
      ["c11c0000-0000-4000-8000-000000000101", "Bennett Dental Central"],
      ["c11c0000-0000-4000-8000-000000000102", "Bennett Dental Riverside"],
      ["c11c0000-0000-4000-8000-000000000103", "Bennett Dental North"],
    ],
    videoGroups: [
      {
        id: "1984801",
        name: "Clinic video guides",
        videos: [
          ["1984901", "Clinic first video", 1],
          ["1984902", "Clinic second video", 2],
        ],
      },
      {
        id: "1984802",
        name: "Clinic visit explainers",
        videos: [
          ["1984903", "Clinic third video", 1],
          ["1984904", "Clinic fourth video", 2],
        ],
      },
    ],
    products: [
      [
        "1984101",
        "Clinic care product one",
        "https://example.com/clinic/product-one",
      ],
      [
        "1984102",
        "Clinic care product two",
        "https://example.com/clinic/product-two",
      ],
      [
        "1984103",
        "Clinic care product three",
        "https://example.com/clinic/product-three",
      ],
      [
        "1984104",
        "Clinic care product four",
        "https://example.com/clinic/product-four",
      ],
    ],
    sentinelIds: [
      "1984991",
      "1984992",
      "1984993",
      "1984994",
      "1984995",
      "1984996",
      "1984997",
      "1984191",
      "1984192",
      "1984193",
      "1984194",
      "1984195",
    ],
    coexistence: [
      '[data-profile-module="clinic-commerce-treatment-services"]',
      '[data-profile-module="clinic-commerce-links"]',
      "[data-blog-id]",
      '[data-profile-module="clinic-commerce-gallery"]',
      '[data-profile-module="clinic-commerce-reviews"]',
    ],
  },
  {
    name: "Specialist Assessment",
    route: "/template-specialist-assessment",
    locations: [
      ["5a5e5500-0000-4000-8000-000000000101", "Fitzrovia Endodontic Centre"],
      ["5a5e5500-0000-4000-8000-000000000103", "City Endodontic Rooms"],
      ["5a5e5500-0000-4000-8000-000000000105", "West End Specialist Centre"],
    ],
    videoGroups: [
      {
        id: "1655101",
        name: "Specialist video guides",
        videos: [
          ["1655201", "Specialist first video", 1],
          ["1655202", "Specialist second video", 2],
        ],
      },
      {
        id: "1655102",
        name: "Specialist visit explainers",
        videos: [
          ["1655203", "Specialist third video", 1],
          ["1655204", "Specialist fourth video", 2],
        ],
      },
    ],
    products: [
      [
        "1655301",
        "Specialist care product one",
        "https://example.com/specialist/product-one",
      ],
      [
        "1655302",
        "Specialist care product two",
        "https://example.com/specialist/product-two",
      ],
      [
        "1655303",
        "Specialist care product three",
        "https://example.com/specialist/product-three",
      ],
      [
        "1655304",
        "Specialist care product four",
        "https://example.com/specialist/product-four",
      ],
    ],
    sentinelIds: [
      "1655291",
      "1655292",
      "1655293",
      "1655294",
      "1655295",
      "1655296",
      "1655297",
      "1655391",
      "1655392",
      "1655393",
      "1655394",
      "1655395",
    ],
    coexistence: [
      '[data-profile-module="specialist-assessment-treatment-services"]',
      '[data-profile-module="specialist-assessment-links"]',
      '[data-profile-module="specialist-assessment-blogs"]',
      '[data-profile-module="specialist-assessment-gallery"]',
      '[data-profile-module="specialist-assessment-reviews"]',
    ],
  },
  {
    name: "Trust-First Family Practice",
    route: "/template-trust-first",
    locations: [
      ["7f570000-0000-4000-8000-000000000003", "Willow Family Dental"],
      ["7f570000-0000-4000-8000-000000000103", "Willow Family Dental East"],
      ["7f570000-0000-4000-8000-000000000105", "Willow Family Dental South"],
    ],
    videoGroups: [
      {
        id: "1637101",
        name: "Family video guides",
        videos: [
          ["1637201", "Family first video", 1],
          ["1637202", "Family second video", 2],
        ],
      },
      {
        id: "1637102",
        name: "Family visit explainers",
        videos: [
          ["1637203", "Family third video", 1],
          ["1637204", "Family fourth video", 2],
        ],
      },
    ],
    products: [
      [
        "1637301",
        "Family care product one",
        "https://example.com/family/product-one",
      ],
      [
        "1637302",
        "Family care product two",
        "https://example.com/family/product-two",
      ],
      [
        "1637303",
        "Family care product three",
        "https://example.com/family/product-three",
      ],
      [
        "1637304",
        "Family care product four",
        "https://example.com/family/product-four",
      ],
    ],
    sentinelIds: [
      "1637291",
      "1637292",
      "1637293",
      "1637294",
      "1637295",
      "1637296",
      "1637297",
      "1637391",
      "1637392",
      "1637393",
      "1637394",
      "1637395",
    ],
    coexistence: [
      '[data-profile-module="trust-first-family-practice-treatment-services"]',
      '[data-profile-module="trust-first-family-practice-links"]',
      '[data-profile-module="trust-first-family-blogs"]',
      '[data-profile-module="trust-first-family-practice-gallery"]',
      '[data-profile-module="trust-first-family-practice-reviews"]',
    ],
  },
] as const;

for (const showcase of SHOWCASES) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`${showcase.name} exposes complete next-wave collections on ${viewport.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      const response = await page.goto(showcase.route);
      expect(response?.ok()).toBe(true);
      await expect(page.locator("main")).toBeVisible();

      const assertExactInventory = async (phase: "initial" | "reload") => {
        const videos = page.locator(
          '[data-profile-module="videos"] [data-video-id]',
        );
        const videoGroups = page.locator(
          '[data-profile-module="videos"] [data-video-group-id]',
        );
        const products = page.locator(
          '[data-profile-module="shop"] [data-product-id]',
        );
        const locations = page.locator('#location [id^="location-wrapper-"]');
        await expect(videos, `${showcase.name} ${phase} videos`).toHaveCount(4);
        await expect(
          videoGroups,
          `${showcase.name} ${phase} video groups`,
        ).toHaveCount(showcase.videoGroups.length);
        expect(
          await videoGroups.evaluateAll((nodes) =>
            nodes.map((node, index) => ({
              id: node.getAttribute("data-video-group-id"),
              name: node.querySelector("h2")?.textContent?.trim(),
              position: index + 1,
              videos: Array.from(node.querySelectorAll("[data-video-id]")).map(
                (video) => ({
                  id: video.getAttribute("data-video-id"),
                  title: video.querySelector("button")?.textContent?.trim(),
                  position: Number(video.getAttribute("data-video-position")),
                }),
              ),
            })),
          ),
        ).toEqual(
          showcase.videoGroups.map((group, index) => ({
            id: group.id,
            name: group.name,
            position: index + 1,
            videos: group.videos.map(([id, title, position]) => ({
              id,
              title,
              position,
            })),
          })),
        );
        await expect(
          products,
          `${showcase.name} ${phase} products`,
        ).toHaveCount(4);
        await expect(
          locations,
          `${showcase.name} ${phase} locations`,
        ).toHaveCount(3);

        expect(
          await videos.evaluateAll((nodes) =>
            nodes.map((node) => ({
              id: node.getAttribute("data-video-id"),
              title: node.querySelector("button")?.textContent?.trim(),
              position: Number(node.getAttribute("data-video-position")),
            })),
          ),
        ).toEqual(
          showcase.videoGroups.flatMap((group) =>
            group.videos.map(([id, title, position]) => ({
              id,
              title,
              position,
            })),
          ),
        );
        expect(
          await products.evaluateAll((nodes) =>
            nodes.map((node) => ({
              id: node.getAttribute("data-product-id"),
              title: node.querySelector("h3")?.textContent?.trim(),
              position: Number(node.getAttribute("data-product-position")),
              href: node.querySelector("a")?.href,
              target: node.querySelector("a")?.target,
              rel: node.querySelector("a")?.rel,
            })),
          ),
        ).toEqual(
          showcase.products.map(([id, title, href], index) => ({
            id,
            title,
            position: index + 1,
            href,
            target: "_blank",
            rel: "noopener noreferrer",
          })),
        );
        expect(
          await locations.evaluateAll((nodes) =>
            nodes.map((node, index) => ({
              id: node.id.replace("location-wrapper-", ""),
              title: node.querySelector("h3")?.textContent?.trim(),
              position: index + 1,
            })),
          ),
        ).toEqual(
          showcase.locations.map(([id, title], index) => ({
            id,
            title,
            position: index + 1,
          })),
        );
        for (const sentinelId of showcase.sentinelIds) {
          await expect(
            page.locator(
              `[data-video-id="${sentinelId}"], [data-product-id="${sentinelId}"]`,
            ),
          ).toHaveCount(0);
        }
        expect(
          await page
            .locator(
              "[data-video-id], [data-product-id], [id^='location-wrapper-']",
            )
            .evaluateAll(
              (nodes) =>
                new Set(
                  nodes.map(
                    (node) =>
                      node.getAttribute("data-video-id") ??
                      node.getAttribute("data-product-id") ??
                      node.id,
                  ),
                ).size === nodes.length,
            ),
        ).toBe(true);
      };

      await assertExactInventory("initial");
      for (const selector of showcase.coexistence) {
        await expect(
          page.locator(selector).first(),
          `${showcase.name} coexistence ${selector}`,
        ).toBeVisible();
      }

      const firstVideo = page.getByRole("button", {
        name: showcase.videoGroups[0].videos[0][1],
        exact: true,
      });
      await firstVideo.click();
      await expect(
        page.getByRole("region", {
          name: `${showcase.videoGroups[0].videos[0][1]} video player`,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: `Close ${showcase.videoGroups[0].videos[0][1]}`,
        })
        .click();
      await expect(
        page.getByRole("region", {
          name: `${showcase.videoGroups[0].videos[0][1]} video player`,
        }),
      ).toHaveCount(0);

      if (viewport.name === "desktop") {
        const [firstLocationId, firstLocationTitle] = showcase.locations[0];
        const firstLocation = page.locator(
          `#location-wrapper-${firstLocationId}`,
        );
        await firstLocation.getByRole("button", { name: "View map" }).click();
        const mapDialog = page.getByRole("dialog", {
          name: firstLocationTitle,
        });
        await expect(mapDialog).toBeVisible();
        await expect(
          mapDialog.getByRole("heading", { name: firstLocationTitle }),
        ).toBeVisible();
        await mapDialog.getByRole("button", { name: "Done" }).click();
        await expect(mapDialog).toHaveCount(0);
      }

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const scan = await new AxeBuilder({ page })
        .include('[data-profile-module="videos"]')
        .include('[data-profile-module="shop"]')
        .include("#location")
        .withTags(WCAG_TAGS)
        .analyze();
      expect(scan.violations).toEqual([]);

      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath(
          `${showcase.route.slice(1)}-${viewport.name}.png`,
        ),
      });
      await page.reload();
      await assertExactInventory("reload");
    });
  }
}

test("controlled Batch C fixture omits empty location, video, and shop modules", async ({
  page,
}) => {
  const response = await page.goto("/template-next-wave-c-empty");
  expect(response?.ok()).toBe(true);
  await expect(
    page.locator('[data-profile-template="clinic-commerce"]'),
  ).toBeVisible();
  await expect(page.locator('[data-profile-module="videos"]')).toHaveCount(0);
  await expect(page.locator('[data-profile-module="shop"]')).toHaveCount(0);
  await expect(page.locator("#location")).toHaveCount(0);
  await expect(
    page.locator(
      "[data-video-id], [data-product-id], [id^='location-wrapper-']",
    ),
  ).toHaveCount(0);
});
