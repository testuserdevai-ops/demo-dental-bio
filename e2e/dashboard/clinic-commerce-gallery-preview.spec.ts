import AxeBuilder from "@axe-core/playwright";
import { resolve } from "node:path";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

test("Clinic and Commerce gallery mutations reload once and preserve dynamic order", async ({
  page,
  tenant,
}) => {
  test.setTimeout(90_000);
  const admin = await createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      profile_presentation_published: {
        schemaVersion: 1,
        templateId: "clinic-commerce",
        themeId: "editorial-expert",
        layoutVariant: "classic-stack",
        answers: { defaultAudience: "clinic" },
      },
    })
    .eq("id", tenant.userId);
  expect(error).toBeNull();

  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(tenant.email);
  await page.getByPlaceholder("Enter your password").fill(tenant.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await page.goto("/dashboard/gallery");

  const preview = page.locator("#myIframe");
  await expect(preview).toBeAttached();
  await preview.contentFrame().locator("body").waitFor();
  await page.evaluate(() => {
    const state = window as typeof window & { galleryPreviewLoads?: number };
    state.galleryPreviewLoads = 0;
    document.querySelector("#myIframe")?.addEventListener("load", () => {
      state.galleryPreviewLoads = (state.galleryPreviewLoads ?? 0) + 1;
    });
  });
  const reloads = () =>
    page.evaluate(
      () =>
        (window as typeof window & { galleryPreviewLoads?: number })
          .galleryPreviewLoads ?? 0,
    );
  const expectOneReload = async (action: () => Promise<void>) => {
    const before = await reloads();
    await action();
    await expect.poll(reloads, { timeout: 10_000 }).toBe(before + 1);
    await page.waitForTimeout(150);
    expect(await reloads()).toBe(before + 1);
  };
  const image = resolve(
    process.cwd(),
    "public/previews/cosmetic-case-bonding-before.webp",
  );
  const gallery = preview.contentFrame().locator("#gallery");
  const firstCase = `${tenant.runId} first result`;
  const secondCase = `${tenant.runId} second result`;
  const editedCase = `${tenant.runId} first result updated`;
  const generalTitle = `${tenant.runId} studio`;
  const editedGeneral = `${tenant.runId} welcoming studio`;

  for (const title of [firstCase, secondCase]) {
    await expectOneReload(async () => {
      await page.getByRole("button", { name: "Add dental gallery" }).click();
      await page.getByLabel("Gallery title").fill(title);
      await page
        .getByLabel("Before image", { exact: true })
        .setInputFiles(image);
      await page
        .getByLabel("After image", { exact: true })
        .setInputFiles(image);
      await page.getByRole("button", { name: "Save gallery" }).click();
      await expect(
        page.getByRole("button", { name: `Edit ${title}` }),
      ).toBeVisible();
    });
  }
  await expect(
    gallery.locator('[data-gallery-kind="before-after"]'),
  ).toHaveCount(2);

  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Edit ${firstCase}` }).click();
    await page.getByLabel("Gallery title").fill(editedCase);
    await page.getByRole("button", { name: "Update gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedCase}` }),
    ).toBeVisible();
  });
  await expect(
    gallery.getByRole("heading", { name: editedCase }),
  ).toBeVisible();

  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Move ${secondCase} up` }).click();
    await page
      .getByRole("button", { name: "Save dental gallery order" })
      .click();
  });
  await expect(
    gallery.locator('[data-gallery-kind="before-after"] h4'),
  ).toHaveText([secondCase, editedCase]);

  await expectOneReload(async () => {
    await page.getByRole("button", { name: "Add general gallery" }).click();
    await page.getByLabel("Gallery title").fill(generalTitle);
    await page.getByLabel("Image", { exact: true }).setInputFiles(image);
    await page.getByRole("button", { name: "Save gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${generalTitle}` }),
    ).toBeVisible();
  });
  await expect(gallery.getByText(generalTitle)).toBeVisible();

  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Edit ${generalTitle}` }).click();
    await page.getByLabel("Gallery title").fill(editedGeneral);
    await page.getByRole("button", { name: "Update gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedGeneral}` }),
    ).toBeVisible();
  });
  await expect(gallery.getByText(editedGeneral)).toBeVisible();

  await page.reload();
  await preview.contentFrame().locator("body").waitFor();
  await expect(
    page.getByRole("button", { name: `Edit ${editedCase}` }),
  ).toBeVisible();
  await expect(
    preview.contentFrame().locator('[data-gallery-kind="before-after"] h4'),
  ).toHaveText([secondCase, editedCase]);

  await page.evaluate(() => {
    const state = window as typeof window & { galleryPreviewLoads?: number };
    state.galleryPreviewLoads = 0;
    document.querySelector("#myIframe")?.addEventListener("load", () => {
      state.galleryPreviewLoads = (state.galleryPreviewLoads ?? 0) + 1;
    });
  });
  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Delete ${editedCase}` }).click();
    await page
      .getByRole("alertdialog", { name: "Delete gallery?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedCase}` }),
    ).toHaveCount(0);
  });
  await expect(
    preview.contentFrame().getByRole("heading", { name: editedCase }),
  ).toHaveCount(0);

  const reloadsBeforeInvalidSave = await reloads();
  await page.getByRole("button", { name: "Add general gallery" }).click();
  await page.getByRole("button", { name: "Save gallery" }).click();
  await expect(page.getByLabel("Gallery title")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.waitForTimeout(150);
  expect(await reloads()).toBe(reloadsBeforeInvalidSave);
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="gallery-manager"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
