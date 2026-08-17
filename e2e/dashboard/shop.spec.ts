import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/dashboard";

async function installPreviewLoadCounter(page: Page) {
  await expect(page.locator("#myIframe")).toBeAttached();
  await page.frameLocator("#myIframe").locator("body").waitFor();
  await page.evaluate(() => {
    const state = window as typeof window & { shopPreviewLoads?: number };
    state.shopPreviewLoads = 0;
    document.querySelector("#myIframe")?.addEventListener("load", () => {
      state.shopPreviewLoads = (state.shopPreviewLoads ?? 0) + 1;
    });
  });
}

async function previewLoadCount(page: Page) {
  return page.evaluate(
    () =>
      (window as typeof window & { shopPreviewLoads?: number })
        .shopPreviewLoads ?? 0,
  );
}

async function expectOnePreviewReload(page: Page, action: () => Promise<void>) {
  const before = await previewLoadCount(page);
  await action();
  await expect.poll(() => previewLoadCount(page)).toBe(before + 1);
  expect(await previewLoadCount(page)).toBe(before + 1);
}

async function fillProduct(page: Page, name: string, imageName: string) {
  await page.getByLabel("Product name").fill(name);
  await page.getByLabel("Price").fill("19.99");
  await page.getByLabel("Currency").selectOption("GBP(£)");
  await page.getByLabel("Platform").fill("Example Store");
  await page.getByLabel("Product URL").fill("https://example.test/product");
  await page.getByLabel(/product image/i).setInputFiles({
    name: imageName,
    mimeType: "image/webp",
    buffer: Buffer.from("product-image"),
  });
}

test("shop mutations reload preview once and retain rejected drafts", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.goto("/dashboard/shop");
  await expect(page.getByRole("heading", { name: "Shop" })).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="product-manager"]')
    .analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
  await installPreviewLoadCounter(page);

  const firstProduct = `${tenant.runId} care kit`;
  const editedProduct = `${firstProduct} edited`;
  const secondProduct = `${tenant.runId} travel kit`;

  await page.getByRole("button", { name: "Add product" }).click();
  await page
    .getByRole("button", { name: "Add product", exact: true })
    .last()
    .click();
  await expect(page.getByLabel("Product name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(await previewLoadCount(page)).toBe(0);

  await fillProduct(page, firstProduct, "first-product.webp");
  await page.route("**/dashboard/shop**", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().headers()["next-action"]
    ) {
      await route.fulfill({ status: 500, body: "controlled save failure" });
      return;
    }
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Add product", exact: true })
    .last()
    .click();
  await expect(page.getByText("Could not save product").first()).toBeVisible();
  await expect(page.getByLabel("Product name")).toHaveValue(firstProduct);
  expect(await previewLoadCount(page)).toBe(0);
  await page.unroute("**/dashboard/shop**");

  await expectOnePreviewReload(page, async () => {
    await page
      .getByRole("button", { name: "Add product", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${firstProduct}` }),
    ).toBeVisible();
  });
  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: "Add product" }).click();
    await fillProduct(page, secondProduct, "second-product.webp");
    await page
      .getByRole("button", { name: "Add product", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${secondProduct}` }),
    ).toBeVisible();
  });
  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: `Edit ${firstProduct}` }).click();
    await page.getByLabel("Product name").fill(editedProduct);
    await page.getByLabel(/Replace product image/i).setInputFiles({
      name: "replacement-product.webp",
      mimeType: "image/webp",
      buffer: Buffer.from("replacement-product-image"),
    });
    await page.getByRole("button", { name: "Update product" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedProduct}` }),
    ).toBeVisible();
  });
  await expectOnePreviewReload(page, async () => {
    await page
      .getByRole("button", { name: `Move ${editedProduct} down` })
      .click();
    await page.getByRole("button", { name: "Save product order" }).click();
  });
  await expectOnePreviewReload(page, async () => {
    await page.getByRole("switch", { name: `Hide ${editedProduct}` }).click();
    await expect(
      page.getByRole("switch", { name: `Show ${editedProduct}` }),
    ).toBeVisible();
  });

  const beforeCancel = await previewLoadCount(page);
  await page.getByRole("button", { name: `Delete ${editedProduct}` }).click();
  await page
    .getByRole("alertdialog", { name: "Delete product?" })
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(
    page.getByRole("button", { name: `Edit ${editedProduct}` }),
  ).toBeVisible();
  expect(await previewLoadCount(page)).toBe(beforeCancel);

  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: `Delete ${secondProduct}` }).click();
    await page
      .getByRole("alertdialog", { name: "Delete product?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${secondProduct}` }),
    ).toHaveCount(0);
  });

  await page.reload();
  await expect(
    page.getByRole("button", { name: `Edit ${editedProduct}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: `Show ${editedProduct}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Edit ${secondProduct}` }),
  ).toHaveCount(0);
});
