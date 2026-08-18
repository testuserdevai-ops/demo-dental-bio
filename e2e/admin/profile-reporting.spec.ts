import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAdminClient } from "../support/test-environment";

test.beforeEach(async () => {
  const service = await createAdminClient();
  const { error: reportError } = await service
    .from("profile_reports")
    .delete()
    .eq("profile_id", "11111111-1111-4111-8111-111111111111");
  if (reportError) throw reportError;
  const { error: limitError } = await service
    .from("profile_report_submission_limits")
    .delete()
    .gte("submission_count", 1);
  if (limitError) throw limitError;
});

test("a confirmed public concern reaches the accountable admin review queue", async ({
  page,
}) => {
  await page.goto("/pro-user");
  await expect(page.getByText("@pro-user").first()).toBeVisible();
  await page.waitForLoadState("networkidle");

  const shareButton = page
    .getByRole("button", { name: "Share profile" })
    .first();
  await shareButton.click();
  await expect(page.getByRole("dialog", { name: "@pro-user" })).toBeVisible();
  await page.getByRole("button", { name: "Report this Dentalbio" }).click();
  await expect(
    page.getByRole("heading", { name: "Report @pro-user" }),
  ).toBeVisible();

  await page.getByLabel("What is the concern?").click();
  await page
    .getByRole("option", { name: "Privacy or personal data concern" })
    .click();
  await page
    .getByLabel(/Details/)
    .fill("The public profile appears to expose private personal information.");
  await page.getByLabel(/Contact email/).fill("reporter@example.test");

  let submissions = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/reports")) {
      submissions += 1;
    }
  });

  await page.getByRole("button", { name: "Review report" }).click();
  await expect(
    page.getByRole("alertdialog", { name: "Submit this report?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Go back" }).click();
  expect(submissions).toBe(0);

  await page.getByRole("button", { name: "Review report" }).click();
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(
    page.getByRole("heading", { name: "Report received" }),
  ).toBeVisible();
  await expect(page.getByText(/RPT-[A-F0-9]{8}/)).toBeVisible();
  expect(submissions).toBe(1);

  const publicScan = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(
    publicScan.violations.filter(({ impact }) => impact === "critical"),
  ).toEqual([]);

  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await page
    .getByRole("navigation", { name: "Admin workspaces" })
    .getByRole("link", { name: "Reports" })
    .click();

  await expect(
    page.getByRole("heading", { name: "Profile reports" }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Profile report queue" }),
  ).toContainText("pro-user");
  await expect(
    page.getByText("Privacy or personal data concern"),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /Review report .* for pro-user/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Report review" }),
  ).toBeVisible();
  await expect(page.getByText("reporter@example.test")).toBeVisible();
  await expect(page.getByText(/private personal information/)).toBeVisible();

  await page
    .getByLabel("New internal note")
    .fill("Identity check queued with the safety team.");
  await page.getByRole("button", { name: "Add internal note" }).click();
  await expect(
    page.getByText("Identity check queued with the safety team."),
  ).toBeVisible();

  await page.getByLabel("Decision status").click();
  await page.getByRole("option", { name: "Resolved" }).click();
  await page.getByRole("combobox", { name: "Outcome", exact: true }).click();
  await page
    .getByRole("option", { name: "Content removal review requested" })
    .click();
  await page
    .getByLabel("Outcome reason")
    .fill("Evidence documented and escalated for independent content review.");
  await page.getByRole("button", { name: "Save moderation decision" }).click();
  await expect(page.getByText("moderation updated")).toBeVisible();
  await expect(page.getByText("Resolved").first()).toBeVisible();

  const adminScan = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(
    adminScan.violations.filter(({ impact }) => impact === "critical"),
  ).toEqual([]);
});

test("reporting persistence is inaccessible to an unauthenticated caller", async ({
  request,
}) => {
  const response = await request.get("/api/admin/reports");
  expect([401, 403]).toContain(response.status());
});
