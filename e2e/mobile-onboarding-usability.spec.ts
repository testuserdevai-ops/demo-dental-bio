import { expect, test } from "./fixtures/dashboard";
import type { Page, TestInfo } from "@playwright/test";

type MobileGeometry = {
  viewport: { width: number; height: number };
  progressHeight: number;
  headerHeight: number;
  firstCardTop: number;
  firstCardHeight: number;
  secondCardTop: number;
  firstToSecondDistance: number;
  actionBarHeight: number;
  actionBarTop: number;
  actionBarBottom: number;
  continueHeight: number;
  backHeight: number;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
};

async function verifyMobileTemplateJourney(
  page: Page,
  viewport: { width: number; height: number },
  testInfo: TestInfo,
) {
  await page.setViewportSize(viewport);
  await page.goto("/onboarding/appearance?step=theme");

  const themeCards = page.locator("[data-theme-choice-card]");
  const themePreviewButtons = page.getByRole("button", { name: /^Preview / });
  await expect(themeCards).toHaveCount(5);
  await expect(themePreviewButtons).toHaveCount(5);
  const themeGeometry = await themeCards.evaluateAll((cards) => {
    const boxes = cards.map((card) => card.getBoundingClientRect());
    return {
      firstHeight: boxes[0].height,
      firstToSecondDistance: boxes[1].top - boxes[0].top,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  expect(themeGeometry.firstHeight).toBeLessThanOrEqual(205);
  expect(themeGeometry.firstToSecondDistance).toBeLessThanOrEqual(220);
  expect(themeGeometry.scrollWidth).toBe(themeGeometry.clientWidth);

  const clinicalLight = page.locator(
    'input[name="profile-theme"][value="clinical-light"]',
  );
  const warmCare = page.locator(
    'input[name="profile-theme"][value="warm-care"]',
  );
  if (!(await clinicalLight.isChecked())) {
    await clinicalLight.locator("xpath=ancestor::label").click();
  }
  await themePreviewButtons.nth(1).click();
  const themeDialog = page.getByRole("dialog");
  await expect(themeDialog).toBeVisible();
  await expect(themeDialog).toHaveCSS("opacity", "1");
  await expect(warmCare).not.toBeChecked();
  const previewTheme = await page
    .locator("[data-preview-theme-scope]")
    .evaluate((element) => ({
      theme: element.getAttribute("data-profile-theme"),
      primary: getComputedStyle(element).getPropertyValue("--primary").trim(),
    }));
  expect(previewTheme).toEqual({ theme: "warm-care", primary: "#8a3f2d" });
  await expect(
    themeDialog.getByText("Book an appointment", { exact: true }),
  ).toHaveCSS("background-color", "rgb(138, 63, 45)");
  if (viewport.width === 390) {
    await page.screenshot({
      path: testInfo.outputPath("warm-care-preview-390.png"),
    });
  }
  await expect(
    page.getByRole("button", { name: "Use this color" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Use this color" }).click();
  await expect(warmCare).toBeChecked();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page
    .getByRole("button", { name: "Save color and choose a template" })
    .click();
  await expect(page).toHaveURL(/step=template$/);

  const templateGroup = page.getByRole("group", { name: "Profile template" });
  const cards = page.locator("[data-template-choice-card]");
  const actionBar = page.locator("[data-onboarding-action-bar]");
  const continueButton = page.getByRole("button", {
    name: "Save template and continue to questions",
  });
  const backLink = page.getByRole("link", { name: "Back to colors" });

  await expect(cards).toHaveCount(9);
  await expect(continueButton).toBeInViewport();

  const geometry = await page.evaluate<MobileGeometry>(() => {
    const rect = (element: Element | null) => {
      if (!element) throw new Error("Expected mobile layout element");
      return element.getBoundingClientRect();
    };
    const progress = rect(
      document.querySelector('nav[aria-label="Profile setup progress"]'),
    );
    const header = rect(document.querySelector("main section > header"));
    const cards = Array.from(
      document.querySelectorAll("[data-template-choice-card]"),
    ).map((card) => rect(card));
    const actionBar = rect(
      document.querySelector("[data-onboarding-action-bar]"),
    );
    const continueButton = rect(
      document.querySelector<HTMLButtonElement>('button[type="submit"]'),
    );
    const backLink = rect(
      document.querySelector<HTMLAnchorElement>(
        'a[href="/onboarding/appearance?step=theme"]',
      ),
    );

    return {
      viewport: { width: innerWidth, height: innerHeight },
      progressHeight: progress.height,
      headerHeight: header.height,
      firstCardTop: cards[0].top + scrollY,
      firstCardHeight: cards[0].height,
      secondCardTop: cards[1].top + scrollY,
      firstToSecondDistance: cards[1].top - cards[0].top,
      actionBarHeight: actionBar.height,
      actionBarTop: actionBar.top,
      actionBarBottom: actionBar.bottom,
      continueHeight: continueButton.height,
      backHeight: backLink.height,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });

  console.info(`mobile-template-geometry ${JSON.stringify(geometry)}`);

  if (process.env.MOBILE_LAYOUT_MEASURE_ONLY === "1") return;

  expect(geometry.scrollWidth).toBe(geometry.clientWidth);
  expect(geometry.progressHeight).toBeLessThanOrEqual(40);
  expect(geometry.headerHeight).toBeLessThanOrEqual(145);
  expect(geometry.firstCardTop).toBeLessThanOrEqual(300);
  expect(geometry.firstCardHeight).toBeLessThanOrEqual(205);
  expect(geometry.firstToSecondDistance).toBeLessThanOrEqual(220);
  expect(geometry.actionBarHeight).toBeLessThanOrEqual(80);
  expect(geometry.actionBarTop).toBeGreaterThanOrEqual(viewport.height - 80);
  expect(geometry.actionBarBottom).toBeLessThanOrEqual(viewport.height);
  expect(geometry.continueHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.backHeight).toBeGreaterThanOrEqual(44);

  const templateInputs = page.locator('input[name="template"]');
  const basic = templateInputs.first();
  if (!(await basic.isChecked())) {
    await basic.locator("xpath=ancestor::label").click();
  }
  const previewButtons = page.getByRole("button", { name: /^Preview / });
  await expect(previewButtons).toHaveCount(9);

  const firstPreview = previewButtons.first();
  await firstPreview.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(basic).toBeChecked();
  await expect(page.getByRole("button", { name: "Done" })).toBeInViewport();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(firstPreview).toBeFocused();

  const middleTemplate = templateInputs.nth(4);
  await previewButtons.nth(4).click();
  await expect(middleTemplate).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Use this template" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Use this template" }).click();
  await expect(middleTemplate).toBeChecked();

  const lastTemplate = templateInputs.last();
  const lastPreview = previewButtons.last();
  await lastPreview.click();
  await expect(lastTemplate).not.toBeChecked();
  const modalGeometry = await page.getByRole("dialog").evaluate((dialog) => ({
    left: dialog.getBoundingClientRect().left,
    right: dialog.getBoundingClientRect().right,
    width: dialog.getBoundingClientRect().width,
    scrollWidth: dialog.scrollWidth,
    clientWidth: dialog.clientWidth,
  }));
  expect(modalGeometry.left).toBeGreaterThanOrEqual(0);
  expect(modalGeometry.right).toBeLessThanOrEqual(viewport.width);
  expect(modalGeometry.scrollWidth).toBe(modalGeometry.clientWidth);
  await page.getByRole("button", { name: "Use this template" }).click();
  await expect(lastTemplate).toBeChecked();
  await expect(continueButton).toBeInViewport();

  const lastCard = cards.last();
  const lastCardOccluded = await lastCard.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
    const bounds = element.getBoundingClientRect();
    const point = document.elementFromPoint(
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
    );
    return !point || !element.contains(point);
  });
  expect(lastCardOccluded).toBe(false);
  await expect(continueButton).toBeInViewport();

  await continueButton.click();
  await expect(page).toHaveURL(
    /\/onboarding\/questions\?template=clinic-commerce$/,
  );
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 812 },
]) {
  test(`keeps ${viewport.width}x${viewport.height} template comparison compact and completable`, async ({
    dashboardPage: page,
  }, testInfo) => {
    await verifyMobileTemplateJourney(page, viewport, testInfo);
  });
}

test("keeps tablet preview actions visible in the bottom sheet", async ({
  dashboardPage: page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/onboarding/appearance?step=theme");
  await page.getByRole("button", { name: "Preview Warm Care" }).click();

  const dialog = page.getByRole("dialog");
  const useButton = page.getByRole("button", { name: "Use this color" });
  await expect(dialog).toBeVisible();
  await expect(useButton).toBeInViewport();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(768);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1024);
});
