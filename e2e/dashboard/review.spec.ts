import { test, expect } from "../fixtures/dashboard";

test("reviews validates, cancels, creates, and persists a review", async ({ dashboardPage: page, tenant }) => {
  await page.getByRole("link", { name: "Reviews", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/review$/);
  await expect(page.getByRole("heading", { name: "Reviews", exact: true })).toBeVisible();
  await expect(page.getByText("There is no review to show")).toBeVisible();

  await page.getByRole("button", { name: "Add Review" }).click();
  await expect(page.getByRole("heading", { name: "Add New Review" })).toBeVisible();
  const reviewer = page.getByLabel("Reviewer Name");
  const content = page.getByLabel("Review Content");
  const platform = page.getByLabel("Review Platform");
  await page.getByRole("button", { name: "Add Review" }).last().click();
  await expect(reviewer).toHaveAttribute("aria-invalid", "true");
  await expect(content).toHaveAttribute("aria-invalid", "true");
  await expect(content).toHaveAttribute("aria-describedby", "content-error");
  await reviewer.fill(`${tenant.runId} reviewer`);
  await content.fill(`${tenant.runId} review should survive cancel`);
  await platform.fill("Google");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading", { name: "Add New Review" })).toBeHidden();

  await page.getByRole("button", { name: "Add Review" }).click();
  const reviewerName = `${tenant.runId} patient`;
  await page.getByLabel("Reviewer Name").fill(reviewerName);
  await page.getByLabel("Review Content").fill(`${tenant.runId} excellent care`);
  await page.getByLabel("Review Platform").fill("Google");
  await page.getByRole("button", { name: "Add Review" }).last().click();
  await expect(page.getByText(reviewerName, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(reviewerName, { exact: true })).toBeVisible();
});
