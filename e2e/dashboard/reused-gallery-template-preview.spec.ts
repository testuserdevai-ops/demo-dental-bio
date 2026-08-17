import AxeBuilder from "@axe-core/playwright";
import { resolve } from "node:path";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

const MUTATION_VISIBLE_TIMEOUT_MS = 15_000;

test("PFP-GAL-DBK/EED/LPR reuse dynamic gallery mutations with one preview reload", async ({
  page,
  tenant,
}) => {
  test.setTimeout(120_000);
  const admin = await createAdminClient();
  const preview = page.locator("#myIframe");

  const switchTemplate = async (
    templateId:
      "direct-booking" | "expert-educator" | "location-provider-router",
    themeId: "modern-specialist" | "editorial-expert" | "warm-care",
    answers: Record<string, string>,
    moduleId: string,
  ) => {
    const { error } = await admin
      .from("users")
      .update({
        profile_presentation_published: {
          schemaVersion: 1,
          templateId,
          themeId,
          layoutVariant: "classic-stack",
          answers,
        },
      })
      .eq("id", tenant.userId);
    expect(error).toBeNull();
    await page.reload();
    await preview.contentFrame().locator("body").waitFor();
    await expect(
      preview.contentFrame().locator(`[data-profile-template="${templateId}"]`),
    ).toBeVisible();
    return preview
      .contentFrame()
      .locator(`[data-profile-module="${moduleId}"]`);
  };

  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(tenant.email);
  await page.getByPlaceholder("Enter your password").fill(tenant.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await page.goto("/dashboard/gallery");
  await expect(preview).toBeAttached();
  await preview.contentFrame().locator("body").waitFor();

  const installReloadCounter = () =>
    page.evaluate(() => {
      const state = window as typeof window & { galleryPreviewLoads?: number };
      state.galleryPreviewLoads = 0;
      document.addEventListener(
        "load",
        (event) => {
          if (
            event.target instanceof HTMLIFrameElement &&
            event.target.id === "myIframe"
          ) {
            state.galleryPreviewLoads = (state.galleryPreviewLoads ?? 0) + 1;
          }
        },
        true,
      );
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
  const firstCase = `${tenant.runId} first result`;
  const secondCase = `${tenant.runId} second result`;
  const editedCase = `${tenant.runId} first result updated`;
  const generalTitle = `${tenant.runId} practice image`;
  const editedGeneral = `${tenant.runId} learning space`;
  const secondGeneral = `${tenant.runId} care space`;

  let gallery = await switchTemplate(
    "direct-booking",
    "modern-specialist",
    {},
    "direct-booking-gallery",
  );
  await installReloadCounter();
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
      ).toBeVisible({
        timeout: MUTATION_VISIBLE_TIMEOUT_MS,
      });
    });
  }
  await expect(
    gallery.locator('[data-gallery-kind="before-after"]'),
  ).toHaveCount(2);
  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Move ${secondCase} up` }).click();
    await page
      .getByRole("button", { name: "Save dental gallery order" })
      .click();
  });
  await expect(
    gallery.locator('[data-gallery-kind="before-after"] h2'),
  ).toHaveText([secondCase, firstCase]);

  gallery = await switchTemplate(
    "expert-educator",
    "editorial-expert",
    {},
    "expert-educator-gallery",
  );
  await installReloadCounter();
  await expect(gallery.getByRole("heading", { name: firstCase })).toBeVisible();
  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Edit ${firstCase}` }).click();
    await page.getByLabel("Gallery title").fill(editedCase);
    await page.getByRole("button", { name: "Update gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedCase}` }),
    ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
  });
  for (const title of [generalTitle, secondGeneral]) {
    await expectOneReload(async () => {
      await page.getByRole("button", { name: "Add general gallery" }).click();
      await page.getByLabel("Gallery title").fill(title);
      await page.getByLabel("Image", { exact: true }).setInputFiles(image);
      await page.getByRole("button", { name: "Save gallery" }).click();
      await expect(
        page.getByRole("button", { name: `Edit ${title}` }),
      ).toBeVisible({
        timeout: MUTATION_VISIBLE_TIMEOUT_MS,
      });
    });
  }
  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Edit ${generalTitle}` }).click();
    await page.getByLabel("Gallery title").fill(editedGeneral);
    await page.getByRole("button", { name: "Update gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedGeneral}` }),
    ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
  });

  gallery = await switchTemplate(
    "location-provider-router",
    "warm-care",
    { routerKind: "location" },
    "location-provider-router-gallery",
  );
  await installReloadCounter();
  await expect(
    gallery.getByRole("heading", { name: editedCase }),
  ).toBeVisible();
  await expect(gallery.getByText(editedGeneral)).toBeVisible();
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
    preview.contentFrame().getByRole("heading", { name: editedCase }),
  ).toBeVisible();
  await expect(preview.contentFrame().getByText(editedGeneral)).toBeVisible();
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

  const beforeInvalidSave = await reloads();
  await page.getByRole("button", { name: "Add general gallery" }).click();
  await page.getByRole("button", { name: "Save gallery" }).click();
  await expect(page.getByLabel("Gallery title")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.waitForTimeout(150);
  expect(await reloads()).toBe(beforeInvalidSave);
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="gallery-manager"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
