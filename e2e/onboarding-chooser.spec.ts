import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./fixtures/dashboard";
import { createAdminClient } from "./support/test-environment";

function violationSummary(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations
    .map(
      ({ id, impact, help, nodes }) =>
        `${id} (${impact ?? "unknown"}): ${help}\n${nodes
          .map(({ target }) => `  - ${target.join(", ")}`)
          .join("\n")}`,
    )
    .join("\n\n");
}

test("chooses theme then template, resumes its draft, and remains accessible", async ({
  dashboardPage: page,
  tenant,
}) => {
  const admin = await createAdminClient();
  const expired = new Date(Date.now() - 86_400_000).toISOString();
  const { error: downgradeError } = await admin
    .from("users")
    .update({
      subscription_status: "FREE",
      trial_end: expired,
      current_period_end: expired,
      profile_presentation_draft: {
        schemaVersion: 1,
        templateId: "basic",
        themeId: "clinical-light",
        layoutVariant: "classic-stack",
        answers: {},
      },
      profile_presentation_draft_revision: 1,
      profile_presentation_draft_updated_at: new Date().toISOString(),
    })
    .eq("id", tenant.userId);
  expect(downgradeError).toBeNull();

  await page.goto("/onboarding/appearance?step=theme");
  await expect(
    page.getByRole("heading", { name: "Choose your color theme" }),
  ).toBeVisible();
  const themeGroup = page.getByRole("group", { name: "Color theme" });
  const clinical = themeGroup.getByRole("radio", { name: /Clinical Light/ });
  const warm = themeGroup.getByRole("radio", { name: /Warm Care/ });
  await expect(clinical).toBeChecked();
  await expect(
    themeGroup.getByRole("radio", { name: /Premium Contrast/ }),
  ).toBeDisabled();
  const actionBar = page.locator("[data-onboarding-action-bar]");
  await expect(actionBar).toHaveCSS("position", "static");

  await clinical.focus();
  await page.keyboard.press("ArrowRight");
  await expect(warm).toBeChecked();
  await expect(warm.locator("xpath=ancestor::label")).toContainText("Selected");

  let scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations, violationSummary(scan.violations)).toEqual([]);
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations, violationSummary(scan.violations)).toEqual([]);
  await page.emulateMedia({
    forcedColors: "none",
    reducedMotion: "no-preference",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(actionBar).toHaveCSS("position", "fixed");
  const themeContinueButton = page.getByRole("button", {
    name: /Save color and choose a template/,
  });
  await expect(themeContinueButton).toBeInViewport();
  await themeContinueButton.click();
  await expect(page).toHaveURL(/\/onboarding\/appearance\?step=template$/);

  const templateGroup = page.getByRole("group", { name: "Profile template" });
  await expect(templateGroup.getByRole("radio")).toHaveCount(9);
  const basic = templateGroup.getByRole("radio", { name: /^Basic/ });
  const services = templateGroup.getByRole("radio", {
    name: /Services Catalogue/,
  });
  await expect(basic).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Preview Basic" }),
  ).toBeVisible();

  await expect(actionBar).toHaveCSS("position", "fixed");
  const continueButton = page.getByRole("button", {
    name: /Save template and continue to questions/,
  });
  await expect(continueButton).toBeInViewport();
  await services.focus();
  await page.keyboard.press("Space");
  await expect(services).toBeChecked();
  const selectedCard = services.locator("xpath=ancestor::label");
  const previewButton = page.getByRole("button", {
    name: "Preview Services Catalogue",
  });
  const [cardBox, previewButtonBox] = await Promise.all([
    selectedCard.boundingBox(),
    previewButton.boundingBox(),
  ]);
  expect(cardBox).not.toBeNull();
  expect(previewButtonBox).not.toBeNull();
  expect(previewButtonBox!.height).toBeGreaterThanOrEqual(44);

  await previewButton.click();
  const previewDialog = page.getByRole("dialog", {
    name: "Preview template: Services Catalogue",
  });
  await expect(previewDialog).toBeVisible();
  await expect(
    previewDialog.getByAltText(
      /Services Catalogue profile with a large clinician portrait/,
    ),
  ).toBeVisible();
  await expect(previewDialog.getByText("Preview coming soon")).toHaveCount(0);
  await previewDialog.getByRole("button", { name: "Done" }).click();
  await expect(previewButton).toBeFocused();
  await expect(continueButton).toBeInViewport();

  scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations, violationSummary(scan.violations)).toEqual([]);

  await continueButton.click();
  await expect(page).toHaveURL(
    /\/onboarding\/questions\?template=services-catalogue$/,
  );

  await page.goto("/onboarding/appearance?step=template");
  await expect(
    page.getByRole("radio", { name: /Services Catalogue/ }),
  ).toBeChecked();
});
