import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/dashboard";
test("shop validates, creates, toggles, reloads, and deletes bounded products", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.goto("/dashboard/shop");
  await expect(page.getByRole("heading", { name: "Shop" })).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="product-manager"]')
    .analyze();
  expect(scan.violations.filter((v) => v.impact === "critical")).toEqual([]);
  await page.getByRole("button", { name: "Add product" }).click();
  await page
    .getByRole("button", { name: "Add product", exact: true })
    .last()
    .click();
  await expect(page.getByLabel("Product name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  const name = `${tenant.runId} care kit`;
  await page.getByLabel("Product name").fill(name);
  await page.getByLabel("Price").fill("19.99");
  await page.getByLabel("Currency").selectOption("GBP(£)");
  await page.getByLabel("Platform").fill("Example Store");
  await page.getByLabel("Product URL").fill("https://example.test/product");
  await page
    .getByLabel("Product image")
    .setInputFiles({
      name: "product.webp",
      mimeType: "image/webp",
      buffer: Buffer.from("product-image"),
    });
  await page
    .getByRole("button", { name: "Add product", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: `Edit ${name}` }),
  ).toBeVisible();
  await page.getByRole("switch", { name: `Hide ${name}` }).click();
  await expect(
    page.getByRole("switch", { name: `Show ${name}` }),
  ).toBeVisible();
  await page.getByRole("switch", { name: `Show ${name}` }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: `Edit ${name}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await page
    .getByRole("alertdialog", { name: "Delete product?" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("button", { name: `Edit ${name}` })).toHaveCount(
    0,
  );
});
