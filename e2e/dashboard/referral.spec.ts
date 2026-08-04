import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/dashboard";

test("referral renders and copy works without transmitting externally", async ({
  dashboardPage: page,
}) => {
  await page.getByRole("link", { name: "Get One Month Free" }).click();
  await expect(page).toHaveURL(/\/dashboard\/referral$/);
  await expect(
    page.getByRole("heading", { name: "Get One Month Free" }),
  ).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="referral-manager"]')
    .analyze();
  expect(
    scan.violations.filter((violation) => violation.impact === "critical"),
  ).toEqual([]);

  const referral = page.getByLabel("Referral link");
  await expect(referral).toHaveAttribute("readonly", "");
  await expect(referral).toHaveValue(/\/api\/invite\?referral=e2e-/);

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const copy = page.getByRole("button", { name: "Copy link" });
  await copy.focus();
  await copy.press("Enter");
  await expect(page.getByText("Referral link copied")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(await referral.inputValue());

  const email = page.getByLabel("Email");
  await email.fill("not-an-email");
  await page.getByRole("button", { name: "Send referral link" }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await expect(email).toHaveValue("not-an-email");

  await email.fill("friend@provider-failure.invalid");
  await page.getByRole("button", { name: "Send referral link" }).click();
  await expect(
    page.getByText("The invitation could not be sent. Try again."),
  ).toBeVisible();
  await expect(email).toHaveValue("friend@provider-failure.invalid");

  await email.fill("friend@example.test");
  const send = page.getByRole("button", { name: "Send referral link" });
  await send.click();
  await expect(send).toBeDisabled();
  await expect(page.getByText("Referral invitation sent")).toBeVisible();
  await expect(email).toHaveValue("");
});
