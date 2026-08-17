import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

const MUTATION_VISIBLE_TIMEOUT_MS = 15_000;

test("Cosmetic gallery changes persist and remain uncapped in preview", async ({
  dashboardPage: page,
  tenant,
}) => {
  test.setTimeout(120_000);
  const admin = await createAdminClient();
  await page.goto("/onboarding/appearance?step=template");
  await page
    .getByRole("radio", { name: /^Cosmetic Transformation/ })
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
    /\/onboarding\/questions\?template=cosmetic-transformation$/,
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
      publishedTemplate: "cosmetic-transformation",
      publicTemplate: "cosmetic-transformation",
      revisionMatches: true,
    });

  const caseTitles = Array.from(
    { length: 8 },
    (_, index) => `${tenant.runId} result ${index + 1}`,
  );
  const generalTitles = Array.from(
    { length: 4 },
    (_, index) => `${tenant.runId} studio ${index + 1}`,
  );
  const { error: casesError } = await admin.from("galleries").insert(
    caseTitles.map((title, index) => ({
      user_id: tenant.userId,
      title,
      before_image_url: "/previews/cosmetic-case-bonding-before.webp",
      after_image_url: "/previews/cosmetic-case-bonding-after.webp",
      before_image_label: "Before",
      after_image_label: "After",
      rank: index + 1,
      enabled: true,
    })),
  );
  const { error: generalError } = await admin.from("general_galleries").insert(
    generalTitles.map((title, index) => ({
      user_id: tenant.userId,
      title,
      image_url: "/previews/hero-image-2.webp",
      rank: index + 1,
      enabled: true,
    })),
  );
  expect(casesError).toBeNull();
  expect(generalError).toBeNull();

  await page.goto("/dashboard/gallery");
  await expect(page.locator('[data-testid="gallery-manager"]')).toBeVisible({
    timeout: MUTATION_VISIBLE_TIMEOUT_MS,
  });

  const preview = page.frameLocator("#myIframe");
  const previewCases = preview.getByRole("region", { name: "Before & after" });
  const previewGeneral = preview.locator(
    '[data-profile-module="cosmetic-general-gallery"]',
  );
  await expect(previewCases.getByRole("article")).toHaveAttribute(
    "aria-label",
    new RegExp(`case 1 of ${caseTitles.length}$`),
  );
  await expect(previewGeneral.locator("[data-general-gallery-id]")).toHaveCount(
    generalTitles.length,
  );

  const editedTitle = `${caseTitles[0]} updated`;
  await page.getByRole("button", { name: `Edit ${caseTitles[0]}` }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit gallery" });
  await page.getByLabel("Gallery title").fill(editedTitle);
  await page.getByRole("button", { name: "Update gallery" }).click();
  await expect(editDialog).toHaveCount(0, {
    timeout: MUTATION_VISIBLE_TIMEOUT_MS,
  });
  await expect(
    page.getByRole("button", { name: `Edit ${editedTitle}` }),
  ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
  await expect(
    previewCases.getByRole("article", {
      name: new RegExp(`^${editedTitle}, case 1 of 8$`),
    }),
  ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });

  await page.getByRole("button", { name: `Hide ${generalTitles[0]}` }).click();
  await expect(
    page.getByRole("button", { name: `Show ${generalTitles[0]}` }),
  ).toBeVisible({ timeout: MUTATION_VISIBLE_TIMEOUT_MS });
  await expect(previewGeneral.locator("[data-general-gallery-id]")).toHaveCount(
    3,
    { timeout: MUTATION_VISIBLE_TIMEOUT_MS },
  );
  await expect(previewGeneral.getByText(generalTitles[0])).toHaveCount(0, {
    timeout: MUTATION_VISIBLE_TIMEOUT_MS,
  });

  await page.reload();
  await expect(
    page.getByRole("button", { name: `Edit ${editedTitle}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Show ${generalTitles[0]}` }),
  ).toBeVisible();
  await expect(
    page
      .frameLocator("#myIframe")
      .getByRole("region", { name: "Before & after" })
      .getByRole("article"),
  ).toHaveAttribute("aria-label", new RegExp(`^${editedTitle}, case 1 of 8$`));
  await expect(
    page
      .frameLocator("#myIframe")
      .locator(
        '[data-profile-module="cosmetic-general-gallery"] [data-general-gallery-id]',
      ),
  ).toHaveCount(3);

  const scan = await new AxeBuilder({ page })
    .include('[data-testid="gallery-manager"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
