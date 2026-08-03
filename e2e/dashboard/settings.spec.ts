import { test, expect } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

test("settings validates and persists safe profile edits and protects account deletion", async ({ dashboardPage: page, tenant }) => {
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  const firstName = page.getByLabel("First Name", { exact: true });
  const lastName = page.getByLabel("Last Name", { exact: true });
  const save = page.getByRole("button", { name: "Save", exact: true }).first();
  await firstName.fill("");
  await lastName.fill("");
  await save.click();
  await expect(firstName).toHaveAttribute("aria-invalid", "true");
  await expect(firstName).toHaveAttribute("aria-describedby", "settings-first-name-error");
  await expect(lastName).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert").filter({ hasText: "First name is required" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Last name is required" })).toBeVisible();

  const updatedFirst = "Automation Test";
  await firstName.fill(updatedFirst);
  await lastName.fill("Account");
  await save.click();
  const admin = await createAdminClient();
  await expect.poll(async () => {
    const { data } = await admin.from("users").select("first_name,last_name").eq("id", tenant.userId).single();
    return data;
  }).toEqual({ first_name: updatedFirst, last_name: "Account" });
  await page.reload();
  await expect(page.getByLabel("First Name", { exact: true })).toHaveValue(updatedFirst);
  await expect(page.getByLabel("Last Name", { exact: true })).toHaveValue("Account");

  const deleteBio = page.getByRole("button", { name: "Delete Bio" });
  await deleteBio.focus();
  await deleteBio.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Delete bio?" });
  await expect(dialog).toContainText("Are you sure you want to delete your bio?");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(deleteBio).toBeFocused();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
});
