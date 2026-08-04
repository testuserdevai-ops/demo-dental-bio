import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";
test("locations validates and persists the title with a bounded address dialog", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.goto("/dashboard/location");
  await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="location-manager"]')
    .analyze();
  expect(scan.violations.filter((v) => v.impact === "critical")).toEqual([]);
  const title = page.getByLabel("Location title");
  await title.fill("");
  await page.getByRole("button", { name: "Save title" }).click();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  const updated = `${tenant.runId} workplaces`;
  await title.fill(updated);
  await page.getByRole("button", { name: "Save title" }).click();
  const admin = await createAdminClient();
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("dentistries")
        .select("location_title")
        .eq("user_id", tenant.userId)
        .single();
      return data?.location_title;
    })
    .toBe(updated);
  await page.reload();
  await expect(page.getByLabel("Location title")).toHaveValue(updated);
  await page.getByRole("button", { name: "Add location" }).click();
  const dialog = page.getByRole("dialog", { name: "Add location" });
  await dialog.getByRole("button", { name: "Add location" }).click();
  await expect(dialog.getByText("Business name is required")).toBeVisible();
  await expect(dialog.getByText("Address is required")).toBeVisible();
});
