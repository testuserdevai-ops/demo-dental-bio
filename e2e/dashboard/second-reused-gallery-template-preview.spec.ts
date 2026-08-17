import AxeBuilder from "@axe-core/playwright";
import { resolve } from "node:path";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

const MUTATION_VISIBLE_TIMEOUT_MS = 15_000;

test("PFP-GAL-SCG/SPA/TFP preserve dynamic gallery mutations with one preview reload", async ({
  dashboardPage: page,
  tenant,
}) => {
  test.setTimeout(120_000);
  const admin = await createAdminClient();
  const preview = page.locator("#myIframe");

  const switchTemplate = async (
    templateId:
      | "services-catalogue"
      | "specialist-assessment"
      | "trust-first-family-practice",
    templateName:
      | "Services Catalogue"
      | "Specialist Assessment"
      | "Trust-First Family Practice",
    moduleId: string,
  ) => {
    await page.goto("/onboarding/appearance?step=template");
    await page
      .getByRole("radio", { name: new RegExp(`^${templateName}`) })
      .locator("xpath=ancestor::label")
      .click();
    const confirmation = page.getByRole("checkbox", {
      name: /I understand and want to clear/i,
    });
    if (await confirmation.isVisible()) await confirmation.check();
    await page
      .getByRole("button", { name: "Save template and continue to questions" })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/onboarding/questions\\?template=${templateId}$`),
      { timeout: MUTATION_VISIBLE_TIMEOUT_MS },
    );

    await expect
      .poll(async () => {
        const [userResult, projectionResult] = await Promise.all([
          admin
            .from("users")
            .select(
              "profile_presentation_published, profile_presentation_published_revision",
            )
            .eq("id", tenant.userId)
            .single(),
          admin
            .from("public_profiles")
            .select("profile_presentation, profile_presentation_revision")
            .eq("profile_id", tenant.userId)
            .single(),
        ]);
        if (userResult.error) throw userResult.error;
        if (projectionResult.error) throw projectionResult.error;
        const published = userResult.data.profile_presentation_published as {
          templateId?: unknown;
        };
        const projection = projectionResult.data.profile_presentation as {
          templateId?: unknown;
        };
        return {
          publishedTemplate: published.templateId,
          publicTemplate: projection.templateId,
          revisionMatches:
            userResult.data.profile_presentation_published_revision ===
            projectionResult.data.profile_presentation_revision,
        };
      })
      .toEqual({
        publishedTemplate: templateId,
        publicTemplate: templateId,
        revisionMatches: true,
      });

    await page.goto("/dashboard/gallery");
    await expect(page.locator('[data-testid="gallery-manager"]')).toBeVisible({
      timeout: MUTATION_VISIBLE_TIMEOUT_MS,
    });
    await expect(preview).toBeAttached();
    await preview.contentFrame().locator("body").waitFor();
    await expect(
      preview.contentFrame().locator(`[data-profile-template="${templateId}"]`),
    ).toBeVisible();
    return preview
      .contentFrame()
      .locator(`[data-profile-module="${moduleId}"]`);
  };

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
  const firstCase = `${tenant.runId} first result`;
  const secondCase = `${tenant.runId} second result`;
  const editedCase = `${tenant.runId} first result updated`;
  const firstGeneral = `${tenant.runId} practice image`;
  const editedGeneral = `${tenant.runId} welcoming practice`;
  const secondGeneral = `${tenant.runId} care space`;

  let gallery = await switchTemplate(
    "services-catalogue",
    "Services Catalogue",
    "services-catalogue-gallery",
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
      ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
    });
  }
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
    "specialist-assessment",
    "Specialist Assessment",
    "specialist-assessment-gallery",
  );
  await installReloadCounter();
  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Edit ${firstCase}` }).click();
    await page.getByLabel("Gallery title").fill(editedCase);
    await page.getByRole("button", { name: "Update gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedCase}` }),
    ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
  });
  for (const title of [firstGeneral, secondGeneral]) {
    await expectOneReload(async () => {
      await page.getByRole("button", { name: "Add general gallery" }).click();
      await page.getByLabel("Gallery title").fill(title);
      await page
        .getByLabel("Gallery image", { exact: true })
        .setInputFiles(image);
      await page.getByRole("button", { name: "Save gallery" }).click();
      await expect(
        page.getByRole("button", { name: `Edit ${title}` }),
      ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
    });
  }
  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Edit ${firstGeneral}` }).click();
    await page.getByLabel("Gallery title").fill(editedGeneral);
    await page.getByRole("button", { name: "Update gallery" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedGeneral}` }),
    ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
  });

  gallery = await switchTemplate(
    "trust-first-family-practice",
    "Trust-First Family Practice",
    "trust-first-family-practice-gallery",
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
  for (const title of [editedGeneral, editedCase]) {
    await expectOneReload(async () => {
      await page.getByRole("button", { name: `Delete ${title}` }).click();
      await page
        .getByRole("alertdialog", { name: "Delete gallery?" })
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: `Edit ${title}` }),
      ).toHaveCount(0);
    });
    await expect(preview.contentFrame().getByText(title)).toHaveCount(0);
  }

  await installReloadCounter();
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
