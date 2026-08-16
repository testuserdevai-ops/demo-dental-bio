import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/dashboard";

test("blogs validates, persists, edits, reorders, toggles, and deletes", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.goto("/dashboard/blog");
  await expect(page).toHaveURL(/\/dashboard\/blog$/);
  await expect(page.getByRole("heading", { name: "Blogs" })).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="blog-manager"]')
    .analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );

  await page.getByRole("button", { name: "Add blog group" }).click();
  await page.getByRole("button", { name: "Add group", exact: true }).click();
  await expect(page.getByLabel("Group name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  const group = `${tenant.runId} articles`;
  await page.getByLabel("Group name").fill(group);
  await page.getByRole("button", { name: "Add group", exact: true }).click();
  await expect(page.getByRole("heading", { name: group })).toBeVisible();

  await page.getByRole("button", { name: `Add blog to ${group}` }).click();
  await page.getByRole("button", { name: "Save blog" }).click();
  await expect(page.getByLabel("Blog title")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  const title = `${tenant.runId} patient guide`;
  await page.getByLabel("Blog title").fill(title);
  await page
    .getByLabel("Content")
    .fill("A concise guide that stays readable in the dashboard card.");
  await page.getByRole("button", { name: "Save blog" }).click();
  await expect(
    page.getByRole("button", { name: `Edit ${title}` }),
  ).toBeVisible();

  const secondTitle = `${tenant.runId} professional note`;
  await page.getByRole("button", { name: `Add blog to ${group}` }).click();
  await page.getByLabel("Blog title").fill(secondTitle);
  await page
    .getByLabel("Content")
    .fill("A second article proves ordering remains authoritative.");
  await page.getByRole("button", { name: "Save blog" }).click();
  await expect(
    page.getByRole("button", { name: `Edit ${secondTitle}` }),
  ).toBeVisible();

  const editedTitle = `${title} updated`;
  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await page.getByLabel("Blog title").fill(editedTitle);
  await page.getByRole("button", { name: "Update blog" }).click();
  await expect(
    page.getByRole("button", { name: `Edit ${editedTitle}` }),
  ).toBeVisible();

  await page.getByRole("button", { name: `Move ${secondTitle} up` }).click();
  await page.getByRole("button", { name: "Save blog order" }).click();
  await expect(page.getByText(`${group} blog order saved`)).toBeAttached();

  await page.getByRole("switch", { name: `Hide ${editedTitle}` }).click();
  await expect(
    page.getByRole("switch", { name: `Show ${editedTitle}` }),
  ).toBeVisible();
  await page.getByRole("switch", { name: `Show ${editedTitle}` }).click();
  await expect(
    page.getByRole("switch", { name: `Hide ${editedTitle}` }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: `Edit ${editedTitle}` }),
  ).toBeVisible();
  const orderedEdits = await page
    .getByRole("heading", { name: group })
    .locator("xpath=ancestor::section[1]")
    .getByRole("button", { name: /^Edit (?!group )/ })
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label")),
    );
  expect(orderedEdits).toEqual([`Edit ${secondTitle}`, `Edit ${editedTitle}`]);

  await page.getByRole("button", { name: `Delete ${editedTitle}` }).click();
  await page
    .getByRole("alertdialog", { name: "Delete blog?" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `Edit ${editedTitle}` }),
  ).toHaveCount(0);
});
