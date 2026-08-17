import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

test("Cosmetic gallery changes persist and remain uncapped in preview", async ({
  page,
  tenant,
}) => {
  const admin = await createAdminClient();
  const { error: profileError } = await admin
    .from("users")
    .update({
      profile_presentation_published: {
        schemaVersion: 1,
        templateId: "cosmetic-transformation",
        themeId: "premium-contrast",
        layoutVariant: "hero-overlap",
        answers: { consultationKind: "in-person" },
      },
    })
    .eq("id", tenant.userId);
  expect(profileError).toBeNull();

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

  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(tenant.email);
  await page.getByPlaceholder("Enter your password").fill(tenant.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await page.goto("/dashboard/gallery");

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
  await page.getByLabel("Gallery title").fill(editedTitle);
  await page.getByRole("button", { name: "Update gallery" }).click();
  await expect(
    page.getByRole("button", { name: `Edit ${editedTitle}` }),
  ).toBeVisible();
  await expect(
    previewCases.getByRole("article", {
      name: new RegExp(`^${editedTitle}, case 1 of 8$`),
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: `Hide ${generalTitles[0]}` }).click();
  await expect(
    page.getByRole("button", { name: `Show ${generalTitles[0]}` }),
  ).toBeVisible();
  await expect(previewGeneral.locator("[data-general-gallery-id]")).toHaveCount(
    3,
  );
  await expect(previewGeneral.getByText(generalTitles[0])).toHaveCount(0);

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
