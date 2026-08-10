import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/dashboard";

async function openRoute(page: Page, route: "gallery" | "review") {
  await page.goto(`/dashboard/${route}`);
  await expect(page).toHaveURL(new RegExp(`/dashboard/${route}(?:\\?|$)`));
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
    await page.reload();
    await expect(
      page.getByRole("button", { name: `Edit ${edited}` }),
    ).toBeVisible();

    await page.getByRole("button", { name: `Delete ${edited}` }).click();
    const dialog = page.getByRole("alertdialog", { name: "Delete gallery?" });
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${edited}` }),
    ).toHaveCount(0);
  });

  test("validates, creates, edits, and deletes a review", async ({
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
    await page.getByRole("button", { name: "Save review" }).click();
    await expect(page.getByLabel("Reviewer name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    const reviewer = `${tenant.runId} patient`;
    await page.getByLabel("Reviewer name").fill(reviewer);
    await page.getByLabel("Review content").fill("A thoughtful appointment.");
    await page.getByLabel("Review platform").fill("Google");
    await page.getByRole("button", { name: "Save review" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${reviewer}` }),
    ).toBeVisible();

    const edited = `${reviewer} updated`;
    await page.getByRole("button", { name: `Edit ${reviewer}` }).click();
    await page.getByLabel("Reviewer name").fill(edited);
    await page.getByRole("button", { name: "Update review" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${edited}` }),
    ).toBeVisible();
    await page.getByRole("button", { name: `Delete ${edited}` }).click();
    await page
      .getByRole("alertdialog", { name: "Delete review?" })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${edited}` }),
    ).toHaveCount(0);
  });
});
