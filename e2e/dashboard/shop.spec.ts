import { test, expect } from "../fixtures/dashboard";

test("shop validates, cancels, creates, and persists a supported product", async ({ dashboardPage: page, tenant }) => {
  await page.getByRole("link", { name: "Shop", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/shop$/);
  await expect(page.getByRole("heading", { name: "Shop" })).toBeVisible();
  await expect(page.getByText("There is no product to show")).toBeVisible();
  await page.getByRole("button", { name: "Add Product" }).click();
  await expect(page.getByRole("heading", { name: "Add New Product" })).toBeVisible();
  const name = page.getByLabel("Name");
  const price = page.getByLabel("Price");
  const link = page.getByLabel("Link");
  const platform = page.getByLabel("Platform");
  await page.getByRole("button", { name: "Add Product" }).last().click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(price).toHaveAttribute("aria-invalid", "true");
  await name.fill(`${tenant.runId} canceled product`);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading", { name: "Add New Product" })).toBeHidden();

  await page.getByRole("button", { name: "Add Product" }).click();
  const productName = `${tenant.runId} toothbrush`;
  await page.getByLabel("Name").fill(productName);
  await page.getByLabel("Price").fill("19.99");
  await page.getByLabel("Currency").selectOption("GBP(£)");
  await page.getByLabel("Link").fill("https://example.test/toothbrush");
  await page.getByLabel("Platform").fill("Example Store");
  await page.getByRole("button", { name: "Add Product" }).last().click();
  await expect(page.getByText(productName, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(productName, { exact: true })).toBeVisible();
});
