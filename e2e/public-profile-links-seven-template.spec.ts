import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { PROFILE_LINK_SHOWCASES } from "../lib/environment/profile-links-seven-template-fixtures";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const showcase of PROFILE_LINK_SHOWCASES) {
  const { expected, moduleId, name, route, sentinelIds } = showcase;
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`${name} shows every safe saved link on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(route);
      const assertExactInventory = async (phase: "initial" | "reload") => {
        const linkModule = page.locator(
          `[data-profile-module="${moduleId}-links"]`,
        );
        await expect(linkModule, `${name} ${phase} module`).toBeVisible();
        const inventory = linkModule.locator("[data-link-id]");
        expect(await inventory.count()).toBeGreaterThan(3);
        expect(
          await inventory.evaluateAll((nodes) =>
            nodes.map((node) => ({
              id: node.getAttribute("data-link-id"),
              title: node.querySelector("a")?.textContent?.trim(),
              position: Number(node.getAttribute("data-link-position")),
            })),
          ),
          `${name} ${phase} exact ordered inventory`,
        ).toEqual(expected);

        const anchors = inventory.locator("a");
        await expect(anchors).toHaveCount(expected.length);
        for (const anchor of await anchors.all()) {
          await expect(anchor).toHaveAttribute("href", /^https?:\/\//);
          await expect(anchor).toHaveAttribute("target", "_blank");
          await expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
        }
        for (const id of sentinelIds) {
          await expect(
            linkModule.locator(`[data-link-id="${id}"]`),
          ).toHaveCount(0);
        }
      };

      await assertExactInventory("initial");
      await page.reload();
      await assertExactInventory("reload");

      const scan = await new AxeBuilder({ page })
        .include(`[data-profile-module="${moduleId}-links"]`)
        .withTags(WCAG_TAGS)
        .analyze();
      expect(scan.violations).toEqual([]);
    });
  }
}
