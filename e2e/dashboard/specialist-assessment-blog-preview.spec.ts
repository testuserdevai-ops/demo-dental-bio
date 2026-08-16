import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

test("Specialist Assessment blog mutations reload once and persist every visible post", async ({
  page,
  tenant,
}) => {
  const admin = await createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      profile_presentation_published: {
        schemaVersion: 1,
        templateId: "specialist-assessment",
        themeId: "modern-specialist",
        layoutVariant: "section-navigator",
        answers: { primaryPath: "assessment", referralRequired: true },
      },
    })
    .eq("id", tenant.userId);
  expect(error).toBeNull();

  await page.goto("/dashboard/blog");
  const preview = page.locator("#myIframe");
  await expect(preview).toBeAttached();
  await preview.contentFrame().locator("body").waitFor();
  await page.evaluate(() => {
    const state = window as typeof window & { specialistBlogLoads?: number };
    state.specialistBlogLoads = 0;
    document.querySelector("#myIframe")?.addEventListener("load", () => {
      state.specialistBlogLoads = (state.specialistBlogLoads ?? 0) + 1;
    });
  });
  const reloads = () =>
    page.evaluate(
      () =>
        (window as typeof window & { specialistBlogLoads?: number })
          .specialistBlogLoads ?? 0,
    );
  const expectOneReload = async (action: () => Promise<void>) => {
    const before = await reloads();
    await action();
    await expect.poll(reloads, { timeout: 10_000 }).toBe(before + 1);
    await page.waitForTimeout(150);
    expect(await reloads()).toBe(before + 1);
  };

  const firstGroup = `${tenant.runId} assessment guides`;
  const secondGroup = `${tenant.runId} recovery notes`;
  const firstPost = `${tenant.runId} preparing records`;
  const secondPost = `${tenant.runId} asking questions`;
  const thirdPost = `${tenant.runId} planning follow-up`;
  const editedPost = `${tenant.runId} updated records`;

  for (const group of [firstGroup, secondGroup]) {
    await expectOneReload(async () => {
      await page.getByRole("button", { name: "Add blog group" }).click();
      await page.getByLabel("Group name").fill(group);
      await page
        .getByRole("button", { name: "Add group", exact: true })
        .click();
      await expect(page.getByRole("heading", { name: group })).toBeVisible();
    });
  }

  for (const [group, title] of [
    [firstGroup, firstPost],
    [firstGroup, secondPost],
    [secondGroup, thirdPost],
  ] as const) {
    await expectOneReload(async () => {
      await page.getByRole("button", { name: `Add blog to ${group}` }).click();
      await page.getByLabel("Blog title").fill(title);
      await page
        .getByLabel("Content")
        .fill(`Owner-managed content for ${title}.`);
      await page.getByRole("button", { name: "Save blog" }).click();
      await expect(
        page.getByRole("button", { name: `Edit ${title}` }),
      ).toBeVisible();
    });
  }

  const previewBlogs = page
    .frameLocator("#myIframe")
    .locator('[data-profile-module="specialist-assessment-blogs"]');
  await expect(previewBlogs.getByRole("link")).toHaveText([
    firstPost,
    secondPost,
    thirdPost,
  ]);

  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Edit ${firstPost}` }).click();
    await page.getByLabel("Blog title").fill(editedPost);
    await page.getByRole("button", { name: "Update blog" }).click();
  });
  await expect(
    previewBlogs.getByRole("link", { name: editedPost }),
  ).toBeVisible();

  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Move ${editedPost} down` }).click();
    await page.getByRole("button", { name: "Save blog order" }).click();
  });
  await expect(previewBlogs.getByRole("link")).toHaveText([
    secondPost,
    editedPost,
    thirdPost,
  ]);

  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Move ${firstGroup} down` }).click();
    await page.getByRole("button", { name: "Save group order" }).click();
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: firstGroup })).toBeVisible();
  await expect(previewBlogs.getByRole("link")).toHaveText([
    thirdPost,
    secondPost,
    editedPost,
  ]);

  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Delete ${editedPost}` }).click();
    await page
      .getByRole("alertdialog", { name: "Delete blog?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
  });
  await expect(
    previewBlogs.getByRole("link", { name: editedPost }),
  ).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await previewBlogs.scrollIntoViewIfNeeded();
  await expect(previewBlogs).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="blog-manager"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
