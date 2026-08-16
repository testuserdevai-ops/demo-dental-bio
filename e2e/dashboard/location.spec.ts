import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import type { Locator } from "@playwright/test";
import { test, expect } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

const primaryImage = path.resolve(
  process.cwd(),
  "supabase/storage/location-images/db010000-0000-4000-8000-000000000001/dentistries/db010000-0000-4000-8000-000000000002/locations/db010000-0000-4000-8000-000000000003/marylebone-studio.webp",
);
const replacementImage = path.resolve(
  process.cwd(),
  "supabase/storage/location-images/10ca7100-0000-4000-8000-000000000001/dentistries/10ca7100-0000-4000-8000-000000000002/locations/10ca7100-0000-4000-8000-000000000103/north-laine.webp",
);

async function fillLocationAddress(dialog: Locator, businessName: string) {
  await dialog.getByLabel("Business Name").fill(businessName);
  await dialog.getByLabel("Enter your address").fill("1 High Street");
  await dialog.getByLabel("City").fill("London");
  await dialog.locator('input[name="latitude"]').evaluate((input) => {
    (input as HTMLInputElement).value = "51.5";
  });
  await dialog.locator('input[name="longitude"]').evaluate((input) => {
    (input as HTMLInputElement).value = "-0.1";
  });
}

test("locations validates and persists the title with a bounded address dialog", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.goto("/dashboard/location");
  await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="location-manager"]')
    .analyze();
  expect(scan.violations.filter((v) => v.impact === "critical")).toEqual([]);
  const title = page.getByLabel("Location title");
  await title.fill("");
  await page.getByRole("button", { name: "Save title" }).click();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  const updated = `${tenant.runId} workplaces`;
  await title.fill(updated);
  await page.getByRole("button", { name: "Save title" }).click();
  const admin = await createAdminClient();
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("dentistries")
        .select("location_title")
        .eq("user_id", tenant.userId)
        .single();
      return data?.location_title;
    })
    .toBe(updated);
  await page.reload();
  await expect(page.getByLabel("Location title")).toHaveValue(updated);
  await page.getByRole("button", { name: "Add location" }).click();
  const dialog = page.getByRole("dialog", { name: "Add location" });
  await dialog.getByRole("button", { name: "Add location" }).click();
  await expect(dialog.getByText("Business name is required")).toBeVisible();
  await expect(dialog.getByText("Address is required")).toBeVisible();
});

test("location media uploads, persists, removes, and reloads preview exactly once per success", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.route("https://maps.googleapis.com/**", (route) => route.abort());
  await page.goto("/dashboard/location");
  await page.getByRole("button", { name: "Add location" }).click();

  const dialog = page.getByRole("dialog", { name: "Add location" });
  await fillLocationAddress(dialog, `${tenant.runId} clinic`);
  const fileInput = dialog.getByLabel("Add location image");
  await fileInput.setInputFiles(primaryImage);
  await dialog.getByRole("switch", { name: "Decorative image" }).click();
  await dialog
    .getByLabel("Image description")
    .fill(`${tenant.runId} clinic entrance`);
  await expect(
    dialog.getByRole("img", { name: `${tenant.runId} clinic entrance` }),
  ).toBeVisible();

  let previewNavigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame.parentFrame() === page.mainFrame()) previewNavigations += 1;
  });
  await page.route("**/storage/v1/object/location-images/**", async (route) => {
    if (route.request().method() === "POST")
      await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  await page.route("**/dashboard/location**", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().headers()["next-action"]
    )
      await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  await dialog.getByRole("button", { name: "Add location" }).click();
  await expect(dialog.getByText("Uploading location image…")).toBeVisible();
  await expect(dialog.getByText("Saving location…")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("img", { name: `${tenant.runId} clinic entrance` }),
  ).toBeVisible();
  await expect.poll(() => previewNavigations, { timeout: 15_000 }).toBe(1);

  await page.reload();
  await expect(
    page.getByRole("img", { name: `${tenant.runId} clinic entrance` }),
  ).toBeVisible();
  const admin = await createAdminClient();
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("locations")
        .select("image_url,image_alt,image_decorative")
        .eq("business_name", `${tenant.runId} clinic`)
        .single();
      return data;
    })
    .toEqual(
      expect.objectContaining({
        image_alt: `${tenant.runId} clinic entrance`,
        image_decorative: false,
      }),
    );
  const { data: firstRecord } = await admin
    .from("locations")
    .select("image_url")
    .eq("business_name", `${tenant.runId} clinic`)
    .single();
  expect(firstRecord?.image_url).toBeTruthy();

  previewNavigations = 0;
  await page
    .getByRole("button", { name: `Edit ${tenant.runId} clinic` })
    .click();
  let editDialog = page.getByRole("dialog", { name: "Edit location" });
  await editDialog
    .getByLabel("Replace location image")
    .setInputFiles(replacementImage);
  await editDialog
    .getByLabel("Image description")
    .fill(`${tenant.runId} replacement entrance`);
  await editDialog.getByRole("button", { name: "Update location" }).click();
  await expect(editDialog.getByText("Uploading location image…")).toBeVisible();
  await expect(editDialog.getByText("Saving location…")).toBeVisible();
  await expect(editDialog).toBeHidden();
  await expect.poll(() => previewNavigations, { timeout: 15_000 }).toBe(1);
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("locations")
        .select("image_url,image_alt")
        .eq("business_name", `${tenant.runId} clinic`)
        .single();
      return {
        ...data,
        replaced: Boolean(
          data?.image_url && data.image_url !== firstRecord?.image_url,
        ),
      };
    })
    .toEqual(
      expect.objectContaining({
        image_alt: `${tenant.runId} replacement entrance`,
        replaced: true,
      }),
    );
  await expect(
    page.getByRole("img", { name: `${tenant.runId} replacement entrance` }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("img", { name: `${tenant.runId} replacement entrance` }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: `Edit ${tenant.runId} clinic` })
    .click();
  const mobileDialog = page.getByRole("dialog", { name: "Edit location" });
  await expect(mobileDialog).toBeVisible();
  for (const control of [
    mobileDialog.getByLabel("Replace location image"),
    mobileDialog.getByRole("button", { name: "Remove location image" }),
    mobileDialog.getByRole("button", { name: "Update location" }),
  ]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await mobileDialog.evaluate(
      (element) => element.getBoundingClientRect().right <= innerWidth,
    ),
  ).toBe(true);
  const scan = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 720 });
  await mobileDialog.getByRole("button", { name: "Close" }).click();

  previewNavigations = 0;
  await page
    .getByRole("button", { name: `Edit ${tenant.runId} clinic` })
    .click();
  editDialog = page.getByRole("dialog", { name: "Edit location" });
  await expect(editDialog.getByLabel("Image description")).toHaveValue(
    `${tenant.runId} replacement entrance`,
  );
  await editDialog
    .getByRole("button", { name: "Remove location image" })
    .click();
  await editDialog.getByRole("button", { name: "Update location" }).click();
  await expect(editDialog).toBeHidden();
  await expect.poll(() => previewNavigations, { timeout: 15_000 }).toBe(1);
  await expect(
    page.getByRole("img", { name: `${tenant.runId} replacement entrance` }),
  ).toHaveCount(0);
});

test("invalid, upload, and save failures preserve the complete draft with zero preview reloads", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.goto("/dashboard/location");
  await page.getByRole("button", { name: "Add location" }).click();
  const dialog = page.getByRole("dialog", { name: "Add location" });
  await dialog.getByLabel("Business Name").fill("Unsaved clinic draft");
  let previewNavigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame.parentFrame() === page.mainFrame()) previewNavigations += 1;
  });
  await dialog.getByLabel("Add location image").setInputFiles({
    name: "invalid.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("not an image"),
  });
  await expect(dialog.getByText(/Choose a JPEG/)).toBeVisible();
  await expect(dialog.getByLabel("Business Name")).toHaveValue(
    "Unsaved clinic draft",
  );
  expect(previewNavigations).toBe(0);

  await fillLocationAddress(dialog, `${tenant.runId} failed clinic`);
  await dialog.getByLabel("Add location image").setInputFiles(primaryImage);
  await dialog.getByRole("switch", { name: "Decorative image" }).click();
  await dialog
    .getByLabel("Image description")
    .fill(`${tenant.runId} retained entrance`);
  await page.route("**/storage/v1/object/location-images/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "controlled upload failure" }),
      });
      return;
    }
    await route.continue();
  });
  await dialog.getByRole("button", { name: "Add location" }).click();
  await expect(
    dialog.getByText("Location image could not be uploaded"),
  ).toBeVisible();
  await expect(dialog.getByLabel("Business Name")).toHaveValue(
    `${tenant.runId} failed clinic`,
  );
  await expect(dialog.getByLabel("Image description")).toHaveValue(
    `${tenant.runId} retained entrance`,
  );
  await expect(
    dialog.getByRole("img", { name: `${tenant.runId} retained entrance` }),
  ).toBeVisible();
  expect(previewNavigations).toBe(0);

  await page.unroute("**/storage/v1/object/location-images/**");
  await page.route("**/dashboard/location**", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().headers()["next-action"]
    ) {
      await route.fulfill({ status: 500, body: "controlled save failure" });
      return;
    }
    await route.continue();
  });
  await dialog.getByRole("button", { name: "Add location" }).click();
  await expect(
    dialog.getByText("Could not save location").first(),
  ).toBeVisible();
  await expect(dialog.getByLabel("Business Name")).toHaveValue(
    `${tenant.runId} failed clinic`,
  );
  await expect(dialog.getByLabel("Image description")).toHaveValue(
    `${tenant.runId} retained entrance`,
  );
  await expect(
    dialog.getByRole("img", { name: `${tenant.runId} retained entrance` }),
  ).toBeVisible();
  expect(previewNavigations).toBe(0);
});
