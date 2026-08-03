import { test, expect } from "../fixtures/dashboard";

test("blogs creates validated groups and a minimal post with cancel and persistence", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.getByRole("link", { name: "Blogs", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/blog$/);
  await expect(page.getByRole("heading", { name: "Blogs" })).toBeVisible();
  await page.getByRole("button", { name: "Add New Group" }).click();
  const groupTitle = page.getByLabel("Group Title");
  await groupTitle.fill(`${tenant.runId} canceled`);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(groupTitle).toBeHidden();

  await page.getByRole("button", { name: "Add New Group" }).click();
  await groupTitle.clear();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(groupTitle).toHaveAttribute("aria-invalid", "true");
  const group = `${tenant.runId} articles`;
  await groupTitle.fill(group);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(group, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add Blog" }).click();
  await expect(
    page.getByRole("heading", { name: "Add New Blog" }),
  ).toBeVisible();
  const title = page.getByLabel("Title", { exact: true });
  await page.getByRole("button", { name: "Add Blog" }).last().click();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await title.fill(`${tenant.runId} safe post`);
  await expect(page.getByLabel("URL")).toHaveValue(/safe-post$/);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(
    page.getByRole("heading", { name: "Add New Blog" }),
  ).toBeHidden();

  await page.getByRole("button", { name: "Add Blog" }).click();
  const postTitle = `${tenant.runId} persisted post`;
  await page.getByLabel("Title", { exact: true }).fill(postTitle);
  await page.getByRole("button", { name: "Add Blog" }).last().click();
  await expect(page.getByText(postTitle, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(group, { exact: true })).toBeVisible();
  await expect(page.getByText(postTitle, { exact: true })).toBeVisible();
});
