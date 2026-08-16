import { expect, test } from "@playwright/test";

const email = "template-basic@dentalbio.local";
const password = "DentalBioPro123!";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 20_000 });
}

test.describe.serial("template onboarding public state", () => {
  test("keeps product chrome fixed and applies a changed template to the public bio", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await login(page);
    await page.goto("/dashboard/links");

    const desktopProgress = page.locator(
      '[data-testid="dashboard-onboarding-progress"]:visible',
    );
    await expect(desktopProgress).toBeVisible();
    await expect(desktopProgress.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      /\d+/,
    );
    await expect(
      desktopProgress.getByRole("link", {
        name: /Update template or colors/,
      }),
    ).toHaveAttribute("href", "/onboarding/appearance?step=theme");
    const [progressBox, sidebarBox] = await Promise.all([
      desktopProgress.boundingBox(),
      page.locator("nav.ng-white:visible").boundingBox(),
    ]);
    expect(progressBox).not.toBeNull();
    expect(sidebarBox).not.toBeNull();
    expect(progressBox!.y + progressBox!.height).toBeLessThanOrEqual(
      sidebarBox!.y,
    );
    await expect(page.locator("[data-profile-theme]")).toHaveCount(0);

    await page.goto("/onboarding/appearance?step=theme");

    await expect(page.locator("body[data-profile-theme]")).toHaveCount(0);
    await expect(page.locator("[data-profile-theme]")).toHaveCount(1);
    await expect(
      page.locator("[data-preview-theme-scope][data-profile-theme]"),
    ).toHaveCount(1);

    await page
      .getByRole("radio", { name: /Deep Cyan/ })
      .locator("xpath=ancestor::label")
      .click();
    await page.getByRole("button", { name: /Continue with Deep Cyan/ }).click();
    await expect(page).toHaveURL(/step=template$/);

    await page
      .getByRole("radio", { name: /Services Catalogue/ })
      .locator("xpath=ancestor::label")
      .click();
    const confirmation = page.getByRole("checkbox", {
      name: /clear the previous template setup answers/,
    });
    if (await confirmation.isVisible()) await confirmation.check();
    await page
      .getByRole("button", { name: /Save template and continue to questions/ })
      .click();
    await expect(page).toHaveURL(/template=services-catalogue/);
    await expect(page.locator("[data-profile-theme]")).toHaveCount(0);

    const publicPage = await page.context().newPage();
    await publicPage.goto(`/template-basic?state-check=${Date.now()}`);
    await expect(
      publicPage.locator(
        '[data-profile-template-content="services-catalogue"]',
      ),
    ).toBeVisible();
    await expect(
      publicPage.locator('[data-profile-theme="modern-specialist"]'),
    ).toBeVisible();

    await page.goto("/onboarding/appearance?step=template");
    await page
      .getByRole("radio", { name: /^Basic/ })
      .locator("xpath=ancestor::label")
      .click();
    const restoreConfirmation = page.getByRole("checkbox", {
      name: /clear the previous template setup answers/,
    });
    if (await restoreConfirmation.isVisible()) {
      await restoreConfirmation.check();
    }
    await page
      .getByRole("button", { name: /Save template and continue to questions/ })
      .click();
    await expect(page).toHaveURL(/template=basic/);
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 375, height: 812 },
  ]) {
    test(`shows existing records at ${viewport.width}px without overflow`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await login(page);
      await page.goto("/dashboard/links");

      const mobileProgress = page.locator(
        '[data-testid="dashboard-onboarding-progress"]:visible',
      );
      await expect(mobileProgress).toBeVisible();
      await expect(
        mobileProgress.getByRole("link", {
          name: /Update template or colors/,
        }),
      ).toBeInViewport();
      await expect(page.locator("[data-profile-theme]")).toHaveCount(0);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBe(0);

      await page.goto("/onboarding/questions?template=basic&step=links");

      const inventory = page.getByRole("region", { name: "Already saved" });
      await expect(inventory).toBeVisible();
      await expect(inventory.getByRole("listitem").first()).toBeVisible();
      await expect(page.locator("[data-profile-theme]")).toHaveCount(0);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBe(0);
      await expect(page.locator("[data-onboarding-action-bar]")).toHaveCSS(
        "position",
        "fixed",
      );
      await expect(
        page.getByRole("button", { name: "Continue" }),
      ).toBeInViewport();
    });
  }
});
