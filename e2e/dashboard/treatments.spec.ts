import { test, expect } from "../fixtures/dashboard";
import type { Page } from "@playwright/test";
import { createAdminClient } from "../support/test-environment";

const createdTitle = (value: string) =>
  value.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());

async function openTreatments(page: Page) {
  await page
    .getByRole("link", { name: "Treatments / Services", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/treatments(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: "Treatments / Services" }),
  ).toBeVisible();
  await expect(page.getByText("Loading treatments")).toBeHidden();
}

test.describe("treatments and services", () => {
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
    await page.getByLabel("Treatment title").fill(title);
    await page.getByLabel("Treatment description").fill(description);
    await page.getByRole("button", { name: "Add treatment" }).click();

    await expect(
      page.getByRole("heading", { name: "Could not save treatment" }),
    ).toBeVisible();
    await expect(page.getByText("Unable to create treatment")).toBeVisible();
    await expect(page.getByLabel("Treatment title")).toHaveValue(title);
    await expect(page.getByLabel("Treatment description")).toHaveValue(
      description,
    );
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

    await submit.click();
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
    await submit.click();
    await expect(
      page.getByRole("heading", { name: visibleSecondTitle, exact: true }),
    ).toBeVisible();
    const firstCard = page.locator("article", {
      has: page.getByRole("heading", {
        name: visiblePersistedTitle,
        exact: true,
      }),
    });
    const secondCard = page.locator("article", {
      has: page.getByRole("heading", {
        name: visibleSecondTitle,
        exact: true,
      }),
    });
    await firstCard.dragTo(secondCard);
    await page.getByRole("button", { name: "Save treatment order" }).click();
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
        .locator("article .member-heading")
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
    await page.getByRole("button", { name: "Add service" }).click();
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
    await expect(editTrigger).toHaveText(visibleServiceTitle);

    await editTrigger.click();
    const editedTitle = `${serviceTitle} updated`;
    await page.getByLabel("Service title").last().fill(editedTitle);
    await page.getByRole("button", { name: "Update service" }).click();
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
    await page.getByRole("button", { name: "Delete service" }).click();
    await expect(editedTrigger).toBeHidden();
    await page.reload();
    await expect(
      page.getByRole("button", { name: `Edit ${editedTitle}` }),
    ).toHaveCount(0);
  });
});
