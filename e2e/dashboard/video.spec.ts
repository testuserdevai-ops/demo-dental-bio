import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/dashboard";

test("videos validates, persists, toggles, and deletes bounded cards", async ({
  dashboardPage: page,
  tenant,
}) => {
  await page.goto("/dashboard/video");
  await expect(page).toHaveURL(/\/dashboard\/video$/);
  await expect(page.getByRole("heading", { name: "Videos" })).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="video-manager"]')
    .analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );

  await page.getByRole("button", { name: "Add video group" }).click();
  await page.getByRole("button", { name: "Add group", exact: true }).click();
  await expect(page.getByLabel("Group name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  const group = `${tenant.runId} videos`;
  await page.getByLabel("Group name").fill(group);
  await page.getByRole("button", { name: "Add group", exact: true }).click();
  await expect(page.getByRole("heading", { name: group })).toBeVisible();

  await page.getByRole("button", { name: `Add video to ${group}` }).click();
  const title = `${tenant.runId} video guide`;
  await page.getByLabel("Video title").fill(title);
  await page.getByLabel("Video URL").fill("https://example.test/not-video");
  await page.getByRole("button", { name: "Add video", exact: true }).click();
  await expect(page.getByLabel("Video URL")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page
    .getByLabel("Video URL")
    .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Add video", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Edit ${title}` }),
  ).toBeVisible();

  await page.getByRole("switch", { name: `Hide ${title}` }).click();
  await expect(
    page.getByRole("switch", { name: `Show ${title}` }),
  ).toBeVisible();
  await page.getByRole("switch", { name: `Show ${title}` }).click();
  await expect(
    page.getByRole("switch", { name: `Hide ${title}` }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: `Edit ${title}` }),
  ).toBeVisible();

  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await page
    .getByRole("alertdialog", { name: "Delete video?" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("button", { name: `Edit ${title}` })).toHaveCount(
    0,
  );
});
