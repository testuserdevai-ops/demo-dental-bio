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

test("chooses theme then template, resumes the draft, and remains accessible", async ({
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

  await page
    .getByRole("button", { name: /Save color and choose a template/ })
    .click();
  await expect(page).toHaveURL(/\/onboarding\/appearance\?step=template$/);

  const templateGroup = page.getByRole("group", { name: "Profile template" });
  await expect(templateGroup.getByRole("radio")).toHaveCount(9);
  const basic = templateGroup.getByRole("radio", { name: /^Basic/ });
  const services = templateGroup.getByRole("radio", {
    name: /Services Catalogue/,
  });
  await expect(basic).toBeChecked();
  await expect(
    page
      .getByAltText(/Basic DentalBio profile with centered dentist identity/)
      .first(),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await services.focus();
  await page.keyboard.press("Space");
  await expect(services).toBeChecked();
  const selectedCard = services.locator("xpath=ancestor::label");
  const mobilePreview = selectedCard.locator("xpath=following-sibling::div");
  await expect(mobilePreview.getByText("Preview coming soon")).toBeVisible();
  const [cardBox, previewBox] = await Promise.all([
    selectedCard.boundingBox(),
    mobilePreview.boundingBox(),
  ]);
  expect(cardBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(previewBox!.y).toBeGreaterThanOrEqual(cardBox!.y + cardBox!.height);

  scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations, violationSummary(scan.violations)).toEqual([]);

  await page
    .getByRole("button", {
      name: /Save template and continue to questions/,
    })
    .click();
  await expect(page).toHaveURL(
    /\/onboarding\/questions\?template=services-catalogue$/,
  );

  await page.goto("/onboarding/appearance?step=template");
  await expect(
    page.getByRole("radio", { name: /Services Catalogue/ }),
  ).toBeChecked();
});
