import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/dashboard";

async function openRoute(page: Page, route: "gallery" | "review") {
  await page.goto(`/dashboard/${route}`);
  await expect(page).toHaveURL(new RegExp(`/dashboard/${route}(?:\\?|$)`));
}

async function installReviewPreviewCounter(page: Page) {
  await expect(page.locator("#myIframe")).toBeAttached();
  await page.frameLocator("#myIframe").locator("body").waitFor();
  await page.evaluate(() => {
    const state = window as typeof window & { reviewPreviewLoads?: number };
    const iframe = document.querySelector<HTMLIFrameElement>("#myIframe");
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "src",
    );
    if (!iframe || !descriptor?.get || !descriptor.set) {
      throw new Error("Cannot instrument the review preview iframe");
    }
    state.reviewPreviewLoads = 0;
    Object.defineProperty(iframe, "src", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: () => descriptor.get?.call(iframe),
      set: (value: string) => {
        state.reviewPreviewLoads = (state.reviewPreviewLoads ?? 0) + 1;
        descriptor.set?.call(iframe, value);
      },
    });
  });
}

async function reviewPreviewCount(page: Page) {
  return page.evaluate(
    () =>
      (window as typeof window & { reviewPreviewLoads?: number })
        .reviewPreviewLoads ?? 0,
  );
}

async function expectOneReviewReload(page: Page, action: () => Promise<void>) {
  await installReviewPreviewCounter(page);
  const before = await reviewPreviewCount(page);
  await action();
  await expect
    .poll(() => reviewPreviewCount(page), { timeout: 10_000 })
    .toBe(before + 1);
  await page.waitForTimeout(150);
  expect(await reviewPreviewCount(page)).toBe(before + 1);
}

test.describe("galleries and reviews", () => {
  test("creates, edits, deletes, reloads, and has no critical gallery violations", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await openRoute(page, "gallery");
    const scan = await new AxeBuilder({ page })
      .include('[data-testid="gallery-manager"]')
      .analyze();
    expect(
      scan.violations.filter(({ impact }) => impact === "critical"),
    ).toEqual([]);

    const title = `${tenant.runId} smile case`;
    await page.getByRole("button", { name: "Add dental gallery" }).click();
    await page.getByLabel("Gallery title").fill(title);
    const image = {
      name: "case.webp",
      mimeType: "image/webp",
      buffer: Buffer.from("gallery-image"),
    };
    await page.getByLabel("Before image", { exact: true }).setInputFiles(image);
    await page.getByLabel("After image", { exact: true }).setInputFiles(image);
    await page.getByRole("button", { name: "Save gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${title}` }),
    ).toBeVisible();

    const edited = `${title} updated`;
    await page.getByRole("button", { name: `Edit ${title}` }).click();
    await page.getByLabel("Gallery title").fill(edited);
    await page.getByRole("button", { name: "Update gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${edited}` }),
    ).toBeVisible();
    await page.getByRole("button", { name: `Hide ${edited}` }).click();
    await expect(
      page.getByRole("button", { name: `Show ${edited}` }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: `Edit ${edited}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Show ${edited}` }),
    ).toBeVisible();
    await page.getByRole("button", { name: `Show ${edited}` }).click();
    await expect(
      page.getByRole("button", { name: `Hide ${edited}` }),
    ).toBeVisible();

    await page.getByRole("button", { name: `Delete ${edited}` }).click();
    const dialog = page.getByRole("alertdialog", { name: "Delete gallery?" });
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${edited}` }),
    ).toHaveCount(0);
  });

  test("reviews reload the preview exactly once on success and persist order", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await openRoute(page, "review");
    const scan = await new AxeBuilder({ page })
      .include('[data-testid="review-manager"]')
      .analyze();
    expect(
      scan.violations.filter(({ impact }) => impact === "critical"),
    ).toEqual([]);

    await page.getByRole("button", { name: "Add review" }).click();
    await installReviewPreviewCounter(page);
    await page.getByRole("button", { name: "Save review" }).click();
    await expect(page.getByLabel("Reviewer name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(await reviewPreviewCount(page)).toBe(0);
    const reviewer = `${tenant.runId} patient`;
    await page.getByLabel("Reviewer name").fill(reviewer);
    await page.getByLabel("Review content").fill("A thoughtful appointment.");
    await page.getByLabel("Review platform").fill("Google");
    await expectOneReviewReload(page, () =>
      page.getByRole("button", { name: "Save review" }).click(),
    );
    await expect(
      page.getByRole("button", { name: `Edit ${reviewer}` }),
    ).toBeVisible();

    const edited = `${reviewer} updated`;
    await page.getByRole("button", { name: `Edit ${reviewer}` }).click();
    await page.getByLabel("Reviewer name").fill(edited);
    await expectOneReviewReload(page, () =>
      page.getByRole("button", { name: "Update review" }).click(),
    );
    await expect(
      page.getByRole("button", { name: `Edit ${edited}` }),
    ).toBeVisible();
    await expectOneReviewReload(page, () =>
      page.getByRole("button", { name: `Hide ${edited}` }).click(),
    );
    await expect(
      page.getByRole("button", { name: `Show ${edited}` }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: `Show ${edited}` }),
    ).toBeVisible();
    await expectOneReviewReload(page, () =>
      page.getByRole("button", { name: `Show ${edited}` }).click(),
    );
    await expect(
      page.getByRole("button", { name: `Hide ${edited}` }),
    ).toBeVisible();

    const second = `${tenant.runId} second patient`;
    await page.getByRole("button", { name: "Add review" }).click();
    await page.getByLabel("Reviewer name").fill(second);
    await page.getByLabel("Review content").fill("A clear follow-up visit.");
    await page.getByLabel("Review platform").fill("Doctify");
    await expectOneReviewReload(page, () =>
      page.getByRole("button", { name: "Save review" }).click(),
    );
    await expect(
      page.getByRole("button", { name: `Edit ${second}` }),
    ).toBeVisible();
    await page.getByRole("button", { name: `Move ${second} up` }).click();
    await expectOneReviewReload(page, () =>
      page.getByRole("button", { name: "Save review order" }).click(),
    );
    expect(
      await page
        .locator('[data-testid="review-manager"] article h4')
        .allTextContents(),
    ).toEqual([second, edited]);
    await page.reload();
    expect(
      await page
        .locator('[data-testid="review-manager"] article h4')
        .allTextContents(),
    ).toEqual([second, edited]);

    await page.getByRole("button", { name: `Delete ${second}` }).click();
    await installReviewPreviewCounter(page);
    await page
      .getByRole("alertdialog", { name: "Delete review?" })
      .getByRole("button", { name: "Cancel" })
      .click();
    expect(await reviewPreviewCount(page)).toBe(0);

    await page.getByRole("button", { name: `Delete ${edited}` }).click();
    await expectOneReviewReload(page, () =>
      page
        .getByRole("alertdialog", { name: "Delete review?" })
        .getByRole("button", { name: "Delete" })
        .click(),
    );
    await expect(
      page.getByRole("button", { name: `Edit ${edited}` }),
    ).toHaveCount(0);
  });
});
