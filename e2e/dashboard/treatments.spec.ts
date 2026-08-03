import { test, expect } from "../fixtures/dashboard";
import type { Page } from "@playwright/test";

const apiPattern = "**/api/treatments";
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
    await page.route(
      apiPattern,
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Controlled treatment failure" }),
          });
        } else await route.continue();
      },
      { times: 1 },
    );
    await submit.click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Could not save treatment" }),
    ).toContainText("Controlled treatment failure");
    await expect(title).toHaveValue(failedTitle);
    await expect(description).toHaveValue(failedDescription);

    const persistedTitle = `${tenant.runId} check-up`;
    const visiblePersistedTitle = createdTitle(persistedTitle);
    const persistedDescription = `${tenant.runId} safe description`;
    await title.fill(persistedTitle);
    await description.fill(persistedDescription);
    await expect(
      page.getByText(`${persistedDescription.length}/200`),
    ).toBeVisible();

    let releaseRequest!: () => void;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    await page.route(
      apiPattern,
      async (route) => {
        if (route.request().method() === "POST") {
          await requestGate;
        }
        await route.continue();
      },
      { times: 1 },
    );
    await submit.click({ noWaitAfter: true });
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("aria-busy", "true");
    releaseRequest();
    await expect(
      page.getByRole("button", { name: visiblePersistedTitle, exact: true }),
    ).toBeVisible();
    await expect(title).toHaveValue("");
    await expect(description).toHaveValue("");
    await expect(page.getByText("0/200")).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Treatments / Services" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: visiblePersistedTitle, exact: true }),
    ).toBeVisible();
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
    await page.route(
      "**/rest/v1/dentistry_treatments**",
      (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Controlled delete failure" }),
        }),
      { times: 1 },
    );
    await page.getByRole("button", { name: "Delete service" }).click();
    await expect(confirmation.getByRole("alert")).toContainText(
      /Controlled delete failure|Could not delete service/i,
    );
    await page.getByRole("button", { name: "Cancel" }).click();
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
