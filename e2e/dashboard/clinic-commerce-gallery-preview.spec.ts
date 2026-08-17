import AxeBuilder from "@axe-core/playwright";
import { resolve } from "node:path";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

const MUTATION_VISIBLE_TIMEOUT_MS = 15_000;

test("Clinic and Commerce gallery mutations reload once and preserve dynamic order", async ({
  page,
  tenant,
}) => {
  test.setTimeout(180_000);
  const admin = await createAdminClient();
  const presentation = {
    schemaVersion: 1,
    templateId: "clinic-commerce",
    themeId: "editorial-expert",
    layoutVariant: "classic-stack",
    answers: { defaultAudience: "clinic" },
  };
  const { error } = await admin
    .from("users")
    .update({
      profile_presentation_published: presentation,
    })
    .eq("id", tenant.userId);
  expect(error).toBeNull();

  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Enter your email").fill(tenant.email);
  await page.getByPlaceholder("Enter your password").fill(tenant.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await page.goto("/dashboard/gallery");

  const preview = page.locator("#myIframe");
  await expect(preview).toBeAttached();
  await preview.contentFrame().locator("body").waitFor();
  const installReloadCounter = () =>
    page.evaluate(() => {
      const state = window as typeof window & { galleryPreviewLoads?: number };
      const iframe = document.querySelector<HTMLIFrameElement>("#myIframe");
      const srcDescriptor = Object.getOwnPropertyDescriptor(
        HTMLIFrameElement.prototype,
        "src",
      );
      if (!iframe || !srcDescriptor?.get || !srcDescriptor.set) {
        throw new Error("Cannot instrument the gallery preview iframe");
      }

      state.galleryPreviewLoads = 0;
      Object.defineProperty(iframe, "src", {
        configurable: true,
        enumerable: srcDescriptor.enumerable,
        get: () => srcDescriptor.get?.call(iframe),
        set: (value: string) => {
          state.galleryPreviewLoads = (state.galleryPreviewLoads ?? 0) + 1;
          srcDescriptor.set?.call(iframe, value);
        },
      });
    });
  await installReloadCounter();
  const reloads = () =>
    page.evaluate(
      () =>
        (window as typeof window & { galleryPreviewLoads?: number })
          .galleryPreviewLoads ?? 0,
    );
  const expectOneReload = async (action: () => Promise<void>) => {
    await installReloadCounter();
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
  const secondGeneral = `${tenant.runId} care space`;

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
      ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
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
    ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
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
    gallery.locator('[data-gallery-kind="before-after"] h2'),
  ).toHaveText([secondCase, editedCase]);

  await expectOneReload(async () => {
    await page.getByRole("button", { name: "Add general gallery" }).click();
    await page.getByLabel("Gallery title").fill(generalTitle);
    await page
      .getByLabel("Gallery image", { exact: true })
      .setInputFiles(image);
    await page.getByRole("button", { name: "Save gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${generalTitle}` }),
    ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
  });
  await expect(gallery.getByText(generalTitle)).toBeVisible();

  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Edit ${generalTitle}` }).click();
    await page.getByLabel("Gallery title").fill(editedGeneral);
    await page.getByRole("button", { name: "Update gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedGeneral}` }),
    ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
  });
  await expect(gallery.getByText(editedGeneral)).toBeVisible();

  await expectOneReload(async () => {
    await page.getByRole("button", { name: "Add general gallery" }).click();
    await page.getByLabel("Gallery title").fill(secondGeneral);
    await page
      .getByLabel("Gallery image", { exact: true })
      .setInputFiles(image);
    await page.getByRole("button", { name: "Save gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${secondGeneral}` }),
    ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
  });
  await expectOneReload(async () => {
    await page
      .getByRole("button", { name: `Move ${secondGeneral} up` })
      .click();
    await page
      .getByRole("button", { name: "Save general gallery order" })
      .click();
  });
  await expect(
    gallery.locator('[data-gallery-kind="general"] button'),
  ).toHaveText([secondGeneral, editedGeneral]);

  await page.reload();
  await preview.contentFrame().locator("body").waitFor();
  await expect(
    page.getByRole("button", { name: `Edit ${editedCase}` }),
  ).toBeVisible();
  await expect(
    preview.contentFrame().locator('[data-gallery-kind="before-after"] h2'),
  ).toHaveText([secondCase, editedCase]);
  await expect(
    preview.contentFrame().locator('[data-gallery-kind="general"] button'),
  ).toHaveText([secondGeneral, editedGeneral]);

  await installReloadCounter();
  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Delete ${editedGeneral}` }).click();
    await page
      .getByRole("alertdialog", { name: "Delete gallery?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedGeneral}` }),
    ).toHaveCount(0);
  });
  await expect(preview.contentFrame().getByText(editedGeneral)).toHaveCount(0);

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
