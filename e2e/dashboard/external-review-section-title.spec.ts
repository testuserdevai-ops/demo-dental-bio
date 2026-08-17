import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

test("owner external-review heading persists with exact preview reload semantics", async ({
  dashboardPage: page,
  tenant,
}) => {
  test.setTimeout(90_000);
  const admin = await createAdminClient();
  const { error: pageError } = await admin
    .from("external_review_pages")
    .insert({
      user_id: tenant.userId,
      link: `https://reviews.example/${tenant.runId}`,
      rank: 1,
      enabled: true,
    });
  if (pageError) throw pageError;

  const preview = page.locator("#myIframe");
  const input = page.getByRole("textbox", {
    name: "External review section title",
  });
  const installReloadCounter = () =>
    page.evaluate(() => {
      const iframe = document.querySelector<HTMLIFrameElement>("#myIframe");
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLIFrameElement.prototype,
        "src",
      );
      if (!iframe || !descriptor?.get || !descriptor.set) {
        throw new Error("Cannot instrument the review-heading preview iframe");
      }
      sessionStorage.setItem("reviewHeadingPreviewLoads", "0");
      Object.defineProperty(iframe, "src", {
        configurable: true,
        enumerable: descriptor.enumerable,
        get: () => descriptor.get?.call(iframe),
        set: (value: string) => {
          const loads = Number(
            sessionStorage.getItem("reviewHeadingPreviewLoads") ?? "0",
          );
          sessionStorage.setItem(
            "reviewHeadingPreviewLoads",
            String(loads + 1),
          );
          descriptor.set?.call(iframe, value);
        },
      });
    });
  const reloads = () =>
    page.evaluate(() =>
      Number(sessionStorage.getItem("reviewHeadingPreviewLoads") ?? "0"),
    );
  const expectOneReload = async (action: () => Promise<void>) => {
    await installReloadCounter();
    const before = await reloads();
    await action();
    await expect.poll(reloads).toBe(before + 1);
    await page.waitForTimeout(150);
    expect(await reloads()).toBe(before + 1);
  };

  await page.goto("/dashboard/review");
  await expect(input).toBeVisible();
  await expect(preview).toBeAttached();
  const frame = preview.contentFrame();
  const reviewModule = frame.locator('[data-profile-module="basic-reviews"]');
  await expect(
    reviewModule.locator("[data-external-review-page-id]"),
  ).toHaveCount(1);
  await expect(reviewModule.getByRole("heading", { level: 2 })).toHaveCount(0);
  await expect(reviewModule.getByRole("navigation")).toHaveCount(0);

  await installReloadCounter();
  const beforeInvalid = await reloads();
  await input.evaluate((node) => {
    const element = node as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(element, "x".repeat(101));
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page
    .getByRole("button", { name: "Save external review heading" })
    .click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await page.waitForTimeout(150);
  expect(await reloads()).toBe(beforeInvalid);
  await expect(input).toHaveValue("x".repeat(101));

  const ownerTitle = `More reviews for ${tenant.runId}`.slice(0, 100);
  await input.fill(ownerTitle);
  await expectOneReload(async () => {
    await page
      .getByRole("button", { name: "Save external review heading" })
      .click();
    await expect(page.getByRole("status")).toContainText("saved");
  });
  await expect(
    reviewModule.getByRole("heading", {
      level: 2,
      name: ownerTitle,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    reviewModule.getByRole("navigation", { name: ownerTitle, exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(input).toHaveValue(ownerTitle);
  const reloadedFrame = preview.contentFrame();
  await expect(
    reloadedFrame
      .locator('[data-profile-module="basic-reviews"]')
      .getByRole("heading", { level: 2, name: ownerTitle, exact: true }),
  ).toBeVisible();

  await input.fill("");
  await expectOneReload(async () => {
    await page
      .getByRole("button", { name: "Save external review heading" })
      .click();
    await expect(page.getByRole("status")).toContainText("removed");
  });
  await expect(reviewModule.getByRole("heading", { level: 2 })).toHaveCount(0);
  await expect(reviewModule.getByRole("navigation")).toHaveCount(0);
  await expect(
    reviewModule.locator("[data-external-review-page-id]"),
  ).toHaveCount(1);

  const scan = await new AxeBuilder({ page })
    .include('[data-testid="external-review-section-title-form"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
