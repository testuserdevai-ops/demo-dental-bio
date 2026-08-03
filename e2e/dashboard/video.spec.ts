import { test, expect } from "../fixtures/dashboard";

test("videos creates a group and validates supported URLs before persisting", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.getByRole("link", { name: "Videos", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/video$/);
  await expect(page.getByRole("heading", { name: "Videos" })).toBeVisible();
  await page.getByRole("button", { name: "Add New Group" }).click();
  const groupTitle = page.getByLabel("Group Title");
  await groupTitle.fill(`${tenant.runId} canceled`);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(groupTitle).toBeHidden();
  await page.getByRole("button", { name: "Add New Group" }).click();
  const group = `${tenant.runId} videos`;
  await groupTitle.fill(group);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(group, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add Video" }).click();
  await expect(
    page.getByRole("heading", { name: "Add New Video" }),
  ).toBeVisible();
  const title = page.getByLabel("Title", { exact: true });
  const link = page.getByLabel("Video Link");
  await title.fill(`${tenant.runId} invalid video`);
  await link.fill("https://example.test/not-video");
  await page.getByRole("button", { name: "Add Video" }).last().click();
  await expect(link).toHaveAttribute("aria-invalid", "true");
  await expect(link).toHaveValue("https://example.test/not-video");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Add Video" }).click();
  const videoTitle = `${tenant.runId} demo video`;
  await page.getByLabel("Title", { exact: true }).fill(videoTitle);
  await page
    .getByLabel("Video Link")
    .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Add Video" }).last().click();
  await expect(page.getByText(videoTitle, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(group, { exact: true })).toBeVisible();
  await expect(page.getByText(videoTitle, { exact: true })).toBeVisible();
});
