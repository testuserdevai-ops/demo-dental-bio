import { expect, test } from "./fixtures/dashboard";
import { createAdminClient } from "./support/test-environment";

const specialistSteps = [
  ["profile-details", "Add your profile and booking details"],
  ["social-links", "Add social profiles"],
  ["links", "Add useful links"],
  ["treatments", "Add treatments or services"],
  ["locations", "Add your practice locations"],
] as const;

test("saves optional specialist content-builder progress and resumes on mobile", async ({
  dashboardPage: page,
  tenant,
}) => {
  const admin = await createAdminClient();
  const { data: owner, error: readError } = await admin
    .from("users")
    .select("profile_presentation_draft_revision")
    .eq("id", tenant.userId)
    .single();
  expect(readError).toBeNull();
  const { error: draftError } = await admin
    .from("users")
    .update({
      profile_presentation_draft: {
        schemaVersion: 1,
        templateId: "specialist-assessment",
        themeId: "clinical-light",
        layoutVariant: "classic-stack",
        answers: {},
      },
      profile_presentation_draft_revision:
        (owner?.profile_presentation_draft_revision ?? 0) + 1,
      profile_presentation_draft_updated_at: new Date().toISOString(),
    })
    .eq("id", tenant.userId);
  expect(draftError).toBeNull();
  const { error: resetError } = await admin
    .from("profile_onboarding_progress")
    .delete()
    .eq("user_id", tenant.userId);
  expect(resetError).toBeNull();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/onboarding/questions?template=specialist-assessment&step=profile-details",
  );

  for (const [index, [step, title]] of specialistSteps.entries()) {
    await expect(page).toHaveURL(
      new RegExp(`template=specialist-assessment&step=${step}$`),
    );
    await expect(
      page.getByRole("heading", { name: title, exact: false }),
    ).toBeVisible();
    await expect(page.locator("main form").first()).toBeVisible();
    const skip = page.getByRole("button", { name: "Skip", exact: true });
    await expect(skip).toBeInViewport();
    await expect(skip).toBeEnabled();
    await expect(skip).toHaveCSS("min-height", "44px");
    await expect(page.locator("[data-onboarding-action-bar]")).toHaveCSS(
      "position",
      "fixed",
    );

    if (index === 1) {
      await page.getByRole("button", { name: "Finish later" }).click();
      const widget = page.getByRole("region", {
        name: "Profile setup progress",
      });
      await expect(widget).toContainText("33% complete");
      await expect(widget).toContainText("4 steps remaining");
      await widget
        .getByRole("link", { name: "Continue profile setup" })
        .click();
      await expect(page).toHaveURL(
        /template=specialist-assessment&step=social-links$/,
      );
      await expect(
        page.getByRole("heading", { name: title, exact: false }),
      ).toBeVisible();
    }

    await page.getByRole("button", { name: "Skip", exact: true }).click();
  }

  await expect(page).toHaveURL(/template=specialist-assessment&step=review$/);
  await expect(
    page.getByRole("heading", { name: "Review your profile plan" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continue to dashboard" }).click();
  const widget = page.getByRole("region", { name: "Profile setup progress" });
  await expect(widget).toContainText("100% complete");

  const { data: progress, error: progressError } = await admin
    .from("profile_onboarding_progress")
    .select("template_id,completed_step_ids")
    .eq("user_id", tenant.userId)
    .single();
  expect(progressError).toBeNull();
  expect(progress?.template_id).toBe("specialist-assessment");
  expect(progress?.completed_step_ids).toHaveLength(specialistSteps.length);
  expect(progress?.completed_step_ids).toEqual(
    expect.arrayContaining(specialistSteps.map(([step]) => step)),
  );
});
