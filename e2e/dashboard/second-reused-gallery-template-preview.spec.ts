import AxeBuilder from "@axe-core/playwright";
import { resolve } from "node:path";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

const MUTATION_VISIBLE_TIMEOUT_MS = 15_000;

test("PFP-GAL-SCG/SPA/TFP preserve dynamic gallery mutations with one preview reload", async ({
  page,
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
    themeId: "modern-specialist" | "warm-care",
    answers: Record<string, unknown>,
    moduleId: string,
  ) => {
    const { error } = await admin
      .from("users")
      .update({
        profile_presentation_published: {
          schemaVersion: 1,
          templateId,
          themeId,
          layoutVariant:
            templateId === "trust-first-family-practice"
              ? "classic-stack"
              : "section-navigator",
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
    "warm-care",
    { featuredTreatmentIds: [], showFinancingBeforeTeam: true },
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
    "modern-specialist",
    { primaryPath: "assessment", referralRequired: true },
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
      await page.getByLabel("Image", { exact: true }).setInputFiles(image);
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
    "warm-care",
    { priorityInformation: ["anxiety-care"] },
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
