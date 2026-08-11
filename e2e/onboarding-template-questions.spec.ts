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

test("autosaves conditional template questions and reviews a private draft on mobile", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.goto("/onboarding/appearance?step=theme");
  await page
    .getByRole("button", { name: /Save color and choose a template/ })
    .click();
  await expect(page).toHaveURL(/step=template/);
  await page.getByRole("radio", { name: /Specialist Assessment/ }).check();
  await page
    .getByRole("button", { name: /Save template and continue to questions/ })
    .click();
  await expect(page).toHaveURL(
    /\/onboarding\/questions\?template=specialist-assessment$/,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  const advance = page.getByRole("button", { name: "Continue" });
  const actionBar = page.locator("[data-onboarding-action-bar]");
  await expect(advance).toBeVisible();
  await expect(actionBar).toHaveCSS("position", "fixed");
  const [buttonBox, viewport] = await Promise.all([
    advance.boundingBox(),
    page.evaluate(() => ({
      height: window.innerHeight,
      width: window.innerWidth,
    })),
  ]);
  expect(buttonBox).not.toBeNull();
  expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(viewport.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    viewport.width,
  );

  await advance.click();
  const requiredError = page
    .getByRole("alert", {
      name: "",
    })
    .filter({ hasText: "Choose an answer before continuing" });
  await expect(requiredError).toBeVisible();
  await expect(requiredError).toBeFocused();
  const [errorBox, barBox] = await Promise.all([
    requiredError.boundingBox(),
    actionBar.boundingBox(),
  ]);
  expect(errorBox).not.toBeNull();
  expect(barBox).not.toBeNull();
  expect(errorBox!.y + errorBox!.height).toBeLessThanOrEqual(barBox!.y);

  await page.getByRole("radio", { name: "Online assessment" }).check();
  await expect(page.getByText("Private draft saved")).toBeVisible();
  await advance.click();
  await expect(page).toHaveURL(/step=specialist-referral/);

  await page.getByRole("radio", { name: "No referral is required" }).check();
  await expect(page.getByText("Private draft saved")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "No referral is required" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/step=specialist-emergency/);

  await page
    .getByRole("radio", { name: "No, keep routine booking first" })
    .check();
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations, violationSummary(scan.violations)).toEqual([]);

  await page.getByRole("button", { name: "Review private draft" }).click();
  await expect(page).toHaveURL(/step=review/);
  await expect(
    page.getByRole("heading", { name: "Review your profile plan" }),
  ).toBeVisible();
  await expect(page.getByText("Specialist Assessment")).toBeVisible();
  await expect(page.getByText("Online assessment")).toBeVisible();
  await expect(page.getByText("No referral is required")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue to dashboard" }),
  ).toBeVisible();
  await expect(actionBar).toHaveCSS("position", "fixed");

  const reviewScan = await new AxeBuilder({ page }).analyze();
  expect(
    reviewScan.violations,
    violationSummary(reviewScan.violations),
  ).toEqual([]);

  await page.goBack();
  await expect(page).toHaveURL(/step=specialist-emergency/);
  await expect(
    page.getByRole("radio", { name: "No, keep routine booking first" }),
  ).toBeChecked();

  const admin = await createAdminClient();
  const { data: owner, error } = await admin
    .from("users")
    .select(
      "profile_presentation_published,profile_presentation_draft,profile_presentation_draft_revision",
    )
    .eq("id", tenant.userId)
    .single();
  expect(error).toBeNull();
  expect(owner?.profile_presentation_published).toMatchObject({
    templateId: "basic",
    answers: {},
  });
  expect(owner?.profile_presentation_draft).toMatchObject({
    templateId: "specialist-assessment",
    answers: {
      primaryPath: "assessment",
      referralRequired: false,
      showEmergencyFirst: false,
    },
  });
  expect(owner?.profile_presentation_draft_revision).toBeGreaterThanOrEqual(5);
});
