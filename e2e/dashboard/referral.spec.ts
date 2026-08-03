import { test, expect } from "../fixtures/dashboard";

test("referral renders and copy works without transmitting externally", async ({
  dashboardPage: page,
}) => {
  await page.getByRole("link", { name: "Get One Month Free" }).click();
  await expect(page).toHaveURL(/\/dashboard\/referral$/);
  await expect(
    page.getByRole("heading", { name: "Get One Month Free" }),
  ).toBeVisible();
  const referral = page.getByLabel("Referral Link");
  await expect(referral).toHaveAttribute("readonly", "");
  await expect(referral).toHaveValue(/\/api\/invite\?referral=e2e-/);

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const copy = page.getByRole("button", { name: "Copy Referral Link" });
  await copy.focus();
  await copy.press("Enter");
  await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(await referral.inputValue());

  const email = page.getByLabel("Email");
  await email.fill("not-an-email");
  await page.getByRole("button", { name: "Send Referral Link" }).click();
  await expect(email).toHaveValue("not-an-email");
});
