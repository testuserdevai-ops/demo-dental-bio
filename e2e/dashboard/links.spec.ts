import { test, expect } from "../fixtures/dashboard";

test("links creates validated groups and links and persists them", async ({ dashboardPage: page, tenant }) => {
  await page.getByRole("link", { name: "Links", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/links$/);
  await expect(page.getByRole("heading", { name: "Links" })).toBeVisible();

  await page.getByRole("button", { name: "Add New Group" }).click();
  const groupTitle = page.getByLabel("Group Title");
  await groupTitle.fill(`${tenant.runId} canceled`);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(groupTitle).toBeHidden();
  await page.getByRole("button", { name: "Add New Group" }).click();
  await groupTitle.clear();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(groupTitle).toHaveAttribute("aria-invalid", "true");
  await expect(groupTitle).toHaveAttribute("aria-describedby", "new-link-group-title-error");

  const group = `${tenant.runId} resources`;
  await groupTitle.fill(group);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(group, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add New Link" }).click();
  const title = page.getByLabel("Title", { exact: true });
  const url = page.getByLabel("URL", { exact: true });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await url.fill("not a url");
  await title.fill(`${tenant.runId} website`);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(url).toHaveAttribute("aria-invalid", "true");
  await expect(url).toHaveValue("not a url");

  const linkTitle = `${tenant.runId} website`;
  await url.fill("example.test/path");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(linkTitle, { exact: true })).toBeVisible();
  await expect(page.getByText("https://example.test/path", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(group, { exact: true })).toBeVisible();
  await expect(page.getByText(linkTitle, { exact: true })).toBeVisible();
});
