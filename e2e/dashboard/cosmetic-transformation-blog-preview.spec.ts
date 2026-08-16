import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

test("Cosmetic blog mutations persist as a complete ordered preview", async ({
  dashboardPage: page,
  tenant,
}) => {
  const admin = await createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      profile_presentation_published: {
        schemaVersion: 1,
        templateId: "cosmetic-transformation",
        themeId: "premium-contrast",
        layoutVariant: "hero-overlap",
        answers: { consultationKind: "in-person" },
      },
    })
    .eq("id", tenant.userId);
  expect(error).toBeNull();

  await page.goto("/dashboard/blog");
  const group = `${tenant.runId} smile guides`;
  await page.getByRole("button", { name: "Add blog group" }).click();
  await page.getByLabel("Group name").fill(group);
  await page.getByRole("button", { name: "Add group", exact: true }).click();
  await expect(page.getByRole("heading", { name: group })).toBeVisible({
    timeout: 15_000,
  });

  const titles = Array.from(
    { length: 4 },
    (_, index) => `${tenant.runId} cosmetic guide ${index + 1}`,
  );
  for (const title of titles) {
    await page.getByRole("button", { name: `Add blog to ${group}` }).click();
    await page.getByLabel("Blog title").fill(title);
    await page
      .getByLabel("Content")
      .fill(`Owner-managed cosmetic article content for ${title}.`);
    await page.getByRole("button", { name: "Save blog" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${title}` }),
    ).toBeVisible();
  }

  const preview = page.frameLocator("#myIframe");
  const previewBlogs = preview.locator(
    '[data-profile-module="cosmetic-transformation-blogs"]',
  );
  await expect(
    previewBlogs.getByRole("heading", { name: group, level: 2 }),
  ).toBeVisible();
  await expect(previewBlogs.getByRole("link")).toHaveCount(4);
  await expect(previewBlogs.getByRole("link")).toHaveText(titles);

  const editedTitle = `${titles[0]} updated`;
  await page.getByRole("button", { name: `Edit ${titles[0]}` }).click();
  await page.getByLabel("Blog title").fill(editedTitle);
  await page.getByRole("button", { name: "Update blog" }).click();
  await expect(
    previewBlogs.getByRole("link", { name: editedTitle }),
  ).toBeVisible();

  await page.getByRole("button", { name: `Move ${editedTitle} down` }).click();
  await page.getByRole("button", { name: "Save blog order" }).click();
  await expect(previewBlogs.getByRole("link")).toHaveText([
    titles[1],
    editedTitle,
    titles[2],
    titles[3],
  ]);

  await page.getByRole("button", { name: `Delete ${titles[3]}` }).click();
  await page
    .getByRole("alertdialog", { name: "Delete blog?" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(previewBlogs.getByRole("link", { name: titles[3] })).toHaveCount(
    0,
  );

  await page.reload();
  await expect(page.getByRole("heading", { name: group })).toBeVisible();
  await expect(
    preview
      .locator('[data-profile-module="cosmetic-transformation-blogs"]')
      .getByRole("link"),
  ).toHaveText([titles[1], editedTitle, titles[2]]);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBlogs = preview.locator(
    '[data-profile-module="cosmetic-transformation-blogs"]',
  );
  await mobileBlogs.scrollIntoViewIfNeeded();
  await expect(mobileBlogs).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="blog-manager"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
