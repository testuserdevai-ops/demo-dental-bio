import { test, expect } from "../fixtures/dashboard";
import type { Page } from "@playwright/test";
import { createAdminClient } from "../support/test-environment";
import AxeBuilder from "@axe-core/playwright";

const COLD_COMPILE_TIMEOUT_MS = 15_000;

const createdTitle = (value: string) =>
  value.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());

async function installPreviewLoadCounter(page: Page) {
  await expect(page.locator("#myIframe")).toBeAttached();
  await page.frameLocator("#myIframe").locator("body").waitFor();
  await page.evaluate(() => {
    const state = window as typeof window & { treatmentPreviewLoads?: number };
    const iframe = document.querySelector<HTMLIFrameElement>("#myIframe");
    const srcDescriptor = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "src",
    );
    if (!iframe || !srcDescriptor?.get || !srcDescriptor.set) {
      throw new Error("Cannot instrument the treatment preview iframe");
    }

    state.treatmentPreviewLoads = 0;
    Object.defineProperty(iframe, "src", {
      configurable: true,
      enumerable: srcDescriptor.enumerable,
      get: () => srcDescriptor.get?.call(iframe),
      set: (value: string) => {
        state.treatmentPreviewLoads = (state.treatmentPreviewLoads ?? 0) + 1;
        srcDescriptor.set?.call(iframe, value);
      },
    });
  });
}

async function previewLoadCount(page: Page) {
  return page.evaluate(
    () =>
      (window as typeof window & { treatmentPreviewLoads?: number })
        .treatmentPreviewLoads ?? 0,
  );
}

async function expectOnePreviewReload(page: Page, action: () => Promise<void>) {
  await installPreviewLoadCounter(page);
  const before = await previewLoadCount(page);
  await action();
  await expect
    .poll(() => previewLoadCount(page), { timeout: 10_000 })
    .toBe(before + 1);
  await page.waitForTimeout(150);
  expect(await previewLoadCount(page)).toBe(before + 1);
}

async function openTreatments(page: Page) {
  await page
    .getByRole("link", { name: "Treatments / Services", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/treatments(?:\?|$)/, {
    timeout: COLD_COMPILE_TIMEOUT_MS,
  });
  await expect(
    page.getByRole("heading", { name: "Treatments / Services" }),
  ).toBeVisible({ timeout: COLD_COMPILE_TIMEOUT_MS });
  await expect(page.getByText("Loading treatments")).toBeHidden({
    timeout: COLD_COMPILE_TIMEOUT_MS,
  });
}

test.describe("treatments and services", () => {
  test("edits both public section titles with one preview reload and persistent accessible output", async ({
    dashboardPage: page,
    tenant,
  }) => {
    const admin = await createAdminClient();
    const { data: dentistry, error: dentistryError } = await admin
      .from("dentistries")
      .select("dentistry_id")
      .eq("user_id", tenant.userId)
      .single();
    expect(dentistryError).toBeNull();
    const treatmentId = crypto.randomUUID();
    const serviceId = crypto.randomUUID();
    const { error: itemsError } = await admin.from("treatments").insert([
      {
        treatment_id: treatmentId,
        title: `${tenant.runId} treatment`,
        description: "Treatment description",
        isService: false,
      },
      {
        treatment_id: serviceId,
        title: `${tenant.runId} service`,
        description: "Service description",
        isService: true,
      },
    ]);
    expect(itemsError).toBeNull();
    const { error: joinsError } = await admin
      .from("dentistry_treatments")
      .insert([
        {
          dentistry_id: dentistry!.dentistry_id,
          treatment_id: treatmentId,
          rank: 1,
        },
        {
          dentistry_id: dentistry!.dentistry_id,
          treatment_id: serviceId,
          rank: 2,
        },
      ]);
    expect(joinsError).toBeNull();

    await openTreatments(page);
    const preview = page.frameLocator("#myIframe");

    const treatmentSectionTitle = `${tenant.runId} smile care`;
    const serviceSectionTitle = `${tenant.runId} patient services`;
    await page
      .getByRole("textbox", { name: "Treatment section title" })
      .fill(treatmentSectionTitle);
    await page
      .getByRole("textbox", { name: "Service section title" })
      .fill(serviceSectionTitle);
    await expectOnePreviewReload(page, () =>
      page.getByRole("button", { name: "Save section titles" }).click(),
    );
    await expect(page.getByRole("status")).toContainText(
      "Section titles saved",
      { timeout: COLD_COMPILE_TIMEOUT_MS },
    );
    await expect(
      preview.getByRole("heading", {
        name: treatmentSectionTitle,
        exact: true,
      }),
    ).toBeVisible({ timeout: COLD_COMPILE_TIMEOUT_MS });
    await expect(
      preview.getByRole("heading", {
        name: serviceSectionTitle,
        exact: true,
      }),
    ).toBeVisible({ timeout: COLD_COMPILE_TIMEOUT_MS });
    await page.reload();
    await expect(
      page.getByRole("textbox", { name: "Treatment section title" }),
    ).toHaveValue(treatmentSectionTitle);
    await expect(
      page.getByRole("textbox", { name: "Service section title" }),
    ).toHaveValue(serviceSectionTitle);

    await page.setViewportSize({ width: 390, height: 844 });
    const titleEditor = page.getByTestId("treatment-service-section-titles");
    await titleEditor.scrollIntoViewIfNeeded();
    await expect(titleEditor).toBeVisible();
    expect(
      await titleEditor.evaluate(
        (element) => element.getBoundingClientRect().right <= innerWidth,
      ),
    ).toBe(true);
    const { violations } = await new AxeBuilder({ page })
      .include('[data-testid="treatment-service-section-titles"]')
      .analyze();
    expect(violations).toEqual([]);

    await page.goto(`/${tenant.username}`);
    await expect(
      page.getByRole("heading", { name: treatmentSectionTitle, exact: true }),
    ).toBeVisible({ timeout: COLD_COMPILE_TIMEOUT_MS });
    await expect(
      page.getByRole("heading", { name: serviceSectionTitle, exact: true }),
    ).toBeVisible({ timeout: COLD_COMPILE_TIMEOUT_MS });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: treatmentSectionTitle, exact: true }),
    ).toBeVisible({ timeout: COLD_COMPILE_TIMEOUT_MS });
  });

  test("preserves a draft after a controlled authorization failure", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await openTreatments(page);
    const admin = await createAdminClient();
    const { error } = await admin
      .from("dentistries")
      .delete()
      .eq("user_id", tenant.userId);
    expect(error).toBeNull();

    const title = `${tenant.runId} preserved treatment`;
    const description = `${tenant.runId} preserved description`;
    try {
      await page.getByLabel("Treatment title").fill(title);
      await page.getByLabel("Treatment description").fill(description);
      const submit = page.getByRole("button", { name: "Add treatment" });
      await installPreviewLoadCounter(page);
      await submit.click();

      await expect(
        page.getByRole("heading", { name: "Could not save treatment" }),
      ).toBeVisible({ timeout: COLD_COMPILE_TIMEOUT_MS });
      await expect(submit).toBeEnabled({ timeout: COLD_COMPILE_TIMEOUT_MS });
      await expect(submit).not.toHaveAttribute("aria-busy", "true");
      await expect(page.getByText("Unable to create treatment")).toBeVisible({
        timeout: COLD_COMPILE_TIMEOUT_MS,
      });
      await expect(page.getByLabel("Treatment title")).toHaveValue(title);
      await expect(page.getByLabel("Treatment description")).toHaveValue(
        description,
      );
      expect(await previewLoadCount(page)).toBe(0);
    } finally {
      const { error: restoreError } = await admin.from("dentistries").insert({
        user_id: tenant.userId,
        about_title: `${tenant.runId} profile`,
        about_text: `${tenant.runId} seeded biography`,
      });
      expect(restoreError).toBeNull();
    }
  });

  test("denies an owner reading another dashboard target", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await openTreatments(page);
    const admin = await createAdminClient();
    const email = `${tenant.runId}-other@example.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: `Dbio-${crypto.randomUUID()}!`,
      email_confirm: true,
      user_metadata: {
        username: `${tenant.username}-other`.slice(0, 30),
        first_name: "Other",
        last_name: "Owner",
      },
    });
    if (error || !data.user)
      throw error ?? new Error("Cross-owner fixture returned no user");

    try {
      const response = await page.request.get(
        `/api/treatments?targetUserId=${data.user.id}`,
      );
      expect(response.status()).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "Unable to load treatments",
      });
    } finally {
      await admin.from("users").delete().eq("id", data.user.id);
      await admin.auth.admin.deleteUser(data.user.id);
    }
  });

  test("validates, preserves a failed submission, persists success, and resets", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await openTreatments(page);
    await expect(page.getByText("No treatments yet")).toBeVisible();

    const title = page.getByLabel("Treatment title");
    const description = page.getByLabel("Treatment description");
    const submit = page.getByRole("button", { name: "Add treatment" });
    await submit.focus();
    await expect(submit).toBeFocused();
    await submit.press("Enter");
    await expect(title).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText(/treatment title/i).filter({ hasText: /required|least/i }),
    ).toBeVisible();

    await description.fill("x".repeat(201));
    await expect(page.getByText("201/200")).toBeVisible();
    await expect(page.getByText("Character limit exceeded by 1")).toBeVisible();
    await expect(description).toHaveAttribute("aria-invalid", "true");

    const persistedTitle = `${tenant.runId} check-up`;
    const visiblePersistedTitle = createdTitle(persistedTitle);
    const persistedDescription = `${tenant.runId} safe description`;
    await title.fill(persistedTitle);
    await description.fill(persistedDescription);
    await expect(
      page.getByText(`${persistedDescription.length}/200`),
    ).toBeVisible();

    await expectOnePreviewReload(page, () => submit.click());
    await expect(
      page.getByRole("heading", { name: visiblePersistedTitle, exact: true }),
    ).toBeVisible();
    await expect(title).toHaveValue("");
    await expect(description).toHaveValue("");
    await expect(page.getByText("0/200")).toBeVisible();

    const secondTitle = `${tenant.runId} whitening`;
    const visibleSecondTitle = createdTitle(secondTitle);
    await title.fill(secondTitle);
    await description.fill(`${tenant.runId} second treatment`);
    await expectOnePreviewReload(page, () => submit.click());
    await expect(
      page.getByRole("heading", { name: visibleSecondTitle, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: `Move ${visiblePersistedTitle} down` })
      .click();
    await expectOnePreviewReload(page, () =>
      page.getByRole("button", { name: "Save treatment order" }).click(),
    );
    await expect(page.getByText("Treatment order saved")).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Treatments / Services" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: visiblePersistedTitle, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: visibleSecondTitle, exact: true }),
    ).toBeVisible();
    expect(
      await page
        .locator("article h3")
        .evaluateAll((headings) =>
          headings.map((heading) => heading.textContent),
        ),
    ).toEqual([visibleSecondTitle, visiblePersistedTitle]);
  });

  test("toggles service mode and supports edit and delete dialog keyboard behavior", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await openTreatments(page);
    const switcher = page.getByRole("switch", {
      name: "Add a service instead of a treatment",
    });
    await switcher.focus();
    await switcher.press("Space");
    await expect(switcher).toBeChecked();
    await expect(
      page.getByRole("heading", { name: "Add new service" }),
    ).toBeVisible();

    const serviceTitle = `${tenant.runId} consultation`;
    const visibleServiceTitle = createdTitle(serviceTitle);
    await page.getByLabel("Service title").fill(serviceTitle);
    await page
      .getByLabel("Service description")
      .fill(`${tenant.runId} service description`);
    await expectOnePreviewReload(page, () =>
      page.getByRole("button", { name: "Add service" }).click(),
    );
    const editTrigger = page.getByRole("button", {
      name: `Edit ${visibleServiceTitle}`,
    });
    await expect(editTrigger).toBeVisible();

    await editTrigger.click();
    const editDialog = page.getByRole("dialog", { name: "Edit service" });
    await expect(editDialog).toBeVisible();
    await page
      .getByLabel("Service title")
      .last()
      .fill(`${serviceTitle} edited`);
    await page.keyboard.press("Escape");
    await expect(editDialog).toBeHidden();
    await expect(editTrigger).toBeFocused();
    await expect(editTrigger).toHaveAccessibleName(
      `Edit ${visibleServiceTitle}`,
    );

    await editTrigger.click();
    const editedTitle = `${serviceTitle} updated`;
    await page.getByLabel("Service title").last().fill(editedTitle);
    await expectOnePreviewReload(page, () =>
      page.getByRole("button", { name: "Update service" }).click(),
    );
    const editedTrigger = page.getByRole("button", {
      name: `Edit ${editedTitle}`,
    });
    await expect(editedTrigger).toBeVisible();
    await page.reload();
    await expect(editedTrigger).toBeVisible();

    const deleteButton = page.getByRole("button", {
      name: `Delete ${editedTitle}`,
    });
    await deleteButton.click();
    const confirmation = page.getByRole("alertdialog", {
      name: "Delete service?",
    });
    await expect(confirmation).toContainText(editedTitle);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(confirmation).toBeHidden();
    await expect(deleteButton).toBeFocused();
    await expect(editedTrigger).toBeVisible();

    await deleteButton.click();
    await expectOnePreviewReload(page, () =>
      page.getByRole("button", { name: "Delete service" }).click(),
    );
    await expect(editedTrigger).toBeHidden();
    await page.reload();
    await expect(
      page.getByRole("button", { name: `Edit ${editedTitle}` }),
    ).toHaveCount(0);
  });
});
