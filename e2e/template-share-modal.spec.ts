import { expect, test } from "@playwright/test";

const templateRoutes = [
  "/template-basic",
  "/template-direct-booking",
  "/template-location-router",
  "/template-services-catalogue",
  "/template-cosmetic-results",
  "/template-trust-first",
  "/template-specialist-assessment",
  "/template-clinic-commerce",
  "/template-expert-educator",
] as const;

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test(`keeps every template share surface usable at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);

    for (const route of templateRoutes) {
      await test.step(route, async () => {
        await page.goto(route);
        const profileTheme = await page
          .locator("[data-profile-theme]")
          .first()
          .getAttribute("data-profile-theme");
        expect(profileTheme).toBeTruthy();

        const trigger = page
          .getByRole("button", { name: "Share profile" })
          .first();
        await expect(trigger).toBeVisible();
        const triggerBox = await trigger.boundingBox();
        expect(triggerBox).not.toBeNull();
        expect(triggerBox!.width).toBeGreaterThanOrEqual(44);
        expect(triggerBox!.height).toBeGreaterThanOrEqual(44);
        expect(await trigger.locator("circle").count()).toBe(0);
        await trigger.click();

        const dialog = page.locator('[data-profile-share-dialog="true"]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAttribute(
          "data-profile-theme",
          profileTheme!,
        );
        await expect(
          dialog.getByText("Choose how you want to share this public profile."),
        ).toBeVisible();
        await expect(
          dialog.getByRole("button", { name: /Copy dentalbio/i }),
        ).toBeVisible();
        await expect(
          dialog.getByRole("link", { name: "Share on LinkedIn" }),
        ).toBeVisible();
        await expect(
          dialog.getByRole("link", { name: "Share via Email" }),
        ).toBeVisible();
        await expect(
          dialog.getByRole("button", { name: "Report this Dentalbio" }),
        ).toBeVisible();
        await expect(
          dialog.getByRole("link", { name: "Sign up" }),
        ).toBeVisible();

        const geometry = await dialog.evaluate((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const surface = style.getPropertyValue("--profile-surface").trim();
          const text = style.getPropertyValue("--profile-text").trim();
          return {
            background: style.backgroundColor,
            bottom: rect.bottom,
            height: rect.height,
            surface,
            text,
            textColor: style.color,
            top: rect.top,
            viewportHeight: window.innerHeight,
          };
        });
        expect(geometry.height).toBeGreaterThanOrEqual(
          viewport.width < 640 ? viewport.height - 9 : 680,
        );
        expect(geometry.top).toBeGreaterThanOrEqual(0);
        expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
        expect(geometry.surface).not.toBe("");
        expect(geometry.text).not.toBe("");
        expect(geometry.background).not.toBe("rgba(0, 0, 0, 0)");
        expect(geometry.textColor).not.toBe(geometry.background);
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
        ).toBe(0);

        if (viewport.width < 640) {
          expect(
            Math.abs(geometry.bottom - geometry.viewportHeight),
          ).toBeLessThanOrEqual(1);
        }

        const actionRows = dialog.locator(
          'a[href], button:not([aria-label="Close dialog"])',
        );
        const rowGeometry = await actionRows.evaluateAll((rows) =>
          rows.slice(0, 6).map((row) => {
            const rect = row.getBoundingClientRect();
            return { bottom: rect.bottom, height: rect.height, top: rect.top };
          }),
        );
        expect(rowGeometry).toHaveLength(6);
        for (const row of rowGeometry)
          expect(row.height).toBeGreaterThanOrEqual(64);
        for (let index = 1; index < rowGeometry.length; index += 1) {
          expect(
            rowGeometry[index]!.top - rowGeometry[index - 1]!.bottom,
          ).toBeGreaterThanOrEqual(12);
        }

        await dialog.getByRole("button", { name: "Close dialog" }).click();
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
      });
    }
  });
}
