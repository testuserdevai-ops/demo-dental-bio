import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/dashboard";

test("blogs validates, persists, toggles, and deletes bounded cards", async ({
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

  await page.getByRole("switch", { name: `Hide ${title}` }).click();
  await expect(
    page.getByRole("switch", { name: `Show ${title}` }),
  ).toBeVisible();
  await page.getByRole("switch", { name: `Show ${title}` }).click();
  await expect(
    page.getByRole("switch", { name: `Hide ${title}` }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: `Edit ${title}` }),
  ).toBeVisible();

  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await page
    .getByRole("alertdialog", { name: "Delete blog?" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("button", { name: `Edit ${title}` })).toHaveCount(
    0,
  );
});
