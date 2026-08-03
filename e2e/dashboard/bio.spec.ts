import { test, expect } from "../fixtures/dashboard";

test("bio validates, preserves failure values, and persists reversible profile and social edits", async ({ dashboardPage: page, tenant }) => {
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Name" })).toBeVisible();
  const title = page.getByLabel("Profile Title");
  const email = page.getByLabel("Contact Email (optional)");
  const profileSave = page.getByRole("button", { name: "Save" }).first();

  await email.fill("invalid-email");
  await profileSave.click();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAttribute("aria-describedby", "contact_email-error");
  await expect(page.getByRole("alert").filter({ hasText: "Invalid email address" })).toBeVisible();
  await expect(email).toHaveValue("invalid-email");

  await email.fill(tenant.email);
  await title.fill("");
  await profileSave.click();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveAttribute("aria-describedby", "about_title-error");
  await expect(page.getByRole("alert").filter({ hasText: "Profile title is required" })).toBeVisible();

  const failedTitle = `${tenant.runId} failed profile`;
  await title.fill(failedTitle);
  await email.fill(tenant.email);
  await page.route("**/dashboard", (route) => {
    if (route.request().method() === "POST") route.fulfill({ status: 500, body: "Controlled profile failure" });
    else route.continue();
  }, { times: 1 });
  await profileSave.click();
  await expect(title).toHaveValue(failedTitle);
  await expect(email).toHaveValue(tenant.email);

  const persistedTitle = `${tenant.runId} profile updated`;
  await title.fill(persistedTitle);
  await profileSave.click();
  await expect(profileSave).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Profile Title")).toHaveValue(persistedTitle);

  const instagram = page.getByRole("textbox", { name: "Instagram profile (optional)" });
  const socialSave = page.getByRole("button", { name: "Save" }).last();
  await instagram.fill("not a valid instagram profile!");
  await socialSave.click();
  await expect(instagram).toHaveAttribute("aria-invalid", "true");
  await expect(instagram).toHaveValue("not a valid instagram profile!");

  const handle = `e2e_${tenant.runId.replace(/-/g, "_").slice(0, 20)}`;
  await instagram.fill(`@${handle}`);
  await socialSave.click();
  await expect(page.getByRole("status")).toContainText("Social links saved");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Instagram profile (optional)" })).toHaveValue(`https://www.instagram.com/${handle}`);
});
