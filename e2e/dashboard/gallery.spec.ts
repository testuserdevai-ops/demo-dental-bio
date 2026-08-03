import path from "node:path";
import { test, expect } from "../fixtures/dashboard";

test("gallery validates, supports keyboard cancellation, uploads, persists, and deletes", async ({
  dashboardPage: page,
  tenant,
}) => {
  test.setTimeout(60_000);
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/gallery$/);
  await expect(
    page.getByRole("heading", { name: "Gallery", exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("There is no Gallery to show")).toBeVisible();

  await page.getByRole("button", { name: "Add Gallery", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add New Gallery" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Add Gallery" }).click();
  await expect(dialog.getByLabel("Title")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(dialog.getByText("Before image is required")).toBeVisible();
  await expect(dialog.getByText("After image is required")).toBeVisible();
  await dialog.getByLabel("Title").fill(`${tenant.runId} abandoned gallery`);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Add Gallery", exact: true }).click();
  const title = `${tenant.runId} smile result`;
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByLabel("Before Image Label").fill("Before treatment");
  await dialog.getByLabel("After Image Label").fill("After treatment");
  await dialog
    .locator("#before_image")
    .setInputFiles(path.resolve("public/placeholder.webp"));
  await dialog
    .locator("#after_image")
    .setInputFiles(path.resolve("public/profile.webp"));
  await dialog.getByRole("button", { name: "Add Gallery" }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  const deleteButton = page.getByRole("button", { name: `Delete ${title}` });
  await deleteButton.click();
  const confirmation = page.getByRole("dialog", { name: "Delete gallery?" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  await expect(deleteButton).toBeFocused();
  await deleteButton.click();
  await confirmation.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(title, { exact: true })).toBeHidden();
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeHidden();
});
