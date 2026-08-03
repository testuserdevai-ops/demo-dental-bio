import { test, expect } from "../fixtures/dashboard";

test("locations validates and persists the reversible location heading", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.getByRole("link", { name: "Locations", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/location$/);
  await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();
  const title = page.getByLabel("Location Title");
  const saveTitle = page
    .getByRole("button", { name: "Save", exact: true })
    .first();
  await title.fill("");
  await saveTitle.focus();
  await saveTitle.press("Enter");
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveAttribute(
    "aria-describedby",
    "location_title-error",
  );

  const updated = `${tenant.runId} workplaces`;
  await title.fill(updated);
  await saveTitle.click();
  await expect(saveTitle).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Location Title")).toHaveValue(updated);
  await expect(
    page.getByRole("heading", { name: "Location", exact: true }),
  ).toBeVisible();
});
