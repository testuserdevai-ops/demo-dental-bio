import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/dashboard";

test("external boundary: custom domain validates safely and preserves failures", async ({
  dashboardPage: page,
}) => {
  await page.route("**/api/user/domain", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ domain: null, verified: false }),
      });
      return;
    }
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "Use a valid test domain" }),
    });
  });
  await page.getByRole("link", { name: "Custom Domain" }).click();
  await expect(page).toHaveURL(/\/dashboard\/domain$/);
  await expect(
    page.getByRole("heading", { name: "Custom Domain" }),
  ).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="domain-manager"]')
    .analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
  const input = page.getByLabel("Your domain");
  const submit = page.getByRole("button", { name: "Connect domain" });
  await submit.click();
  await expect(input).toHaveValue("");

  await input.fill("not a domain");
  await submit.click();
  await expect(
    page.getByText("Enter a valid domain, for example example.com"),
  ).toBeVisible();
  await expect(input).toHaveValue("not a domain");

  await input.fill("rejected.example");
  await submit.click();
  await expect(page.getByText("Use a valid test domain")).toBeVisible();
  await expect(input).toHaveValue("rejected.example");
  await expect(submit).toBeEnabled();
});
