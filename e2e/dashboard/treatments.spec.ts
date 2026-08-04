import { test, expect } from "../fixtures/dashboard";
import type { Page } from "@playwright/test";

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

    const failedTitle = `${tenant.runId} failure`;
    const failedDescription = `${tenant.runId} value must survive`;
    await title.fill(failedTitle);
    await description.fill(failedDescription);
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
      page.getByRole("button", { name: visiblePersistedTitle, exact: true }),
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
      page.getByRole("button", { name: visibleSecondTitle, exact: true }),
    ).toBeVisible();
    const moveDown = page.getByRole("button", {
      name: `Move ${visiblePersistedTitle} down`,
    });
    await moveDown.click();
    await expect(
      page.getByText(`${visiblePersistedTitle} moved to position 2`),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save treatment order" }).click();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Treatments / Services" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: visiblePersistedTitle, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: visibleSecondTitle, exact: true }),
    ).toBeVisible();
    expect(
      await page
        .locator("button.member-heading")
        .evaluateAll((buttons) => buttons.map((button) => button.textContent)),
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
      name: visibleServiceTitle,
      exact: true,
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
      name: editedTitle,
      exact: true,
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
      page.getByRole("button", { name: editedTitle, exact: true }),
    ).toHaveCount(0);
  });
});
