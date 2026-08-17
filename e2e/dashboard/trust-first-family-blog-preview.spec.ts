import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

async function installPreviewLoadCounter(page: Page) {
  await expect(page.locator("#myIframe")).toBeAttached();
  await page.frameLocator("#myIframe").locator("body").waitFor();
  await page.evaluate(() => {
    const state = window as typeof window & { trustFirstBlogLoads?: number };
    state.trustFirstBlogLoads = 0;
    document.querySelector("#myIframe")?.addEventListener("load", () => {
      state.trustFirstBlogLoads = (state.trustFirstBlogLoads ?? 0) + 1;
    });
  });
}

async function expectOnePreviewReload(page: Page, action: () => Promise<void>) {
  const before = await page.evaluate(
    () =>
      (window as typeof window & { trustFirstBlogLoads?: number })
        .trustFirstBlogLoads ?? 0,
  );
  await action();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { trustFirstBlogLoads?: number })
            .trustFirstBlogLoads ?? 0,
      ),
    )
    .toBe(before + 1);
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { trustFirstBlogLoads?: number })
          .trustFirstBlogLoads ?? 0,
    ),
  ).toBe(before + 1);
}

test("Trust-First blog mutations reload once and persist ordered preview content", async ({
  page,
  tenant,
}) => {
  test.setTimeout(60_000);
  const admin = await createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      profile_presentation_published: {
        schemaVersion: 1,
        templateId: "trust-first-family-practice",
        themeId: "warm-care",
        layoutVariant: "classic-stack",
        answers: { featuredReviewIds: [], priorityInformation: [] },
      },
    })
    .eq("id", tenant.userId);
  expect(error).toBeNull();

  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Enter your email").fill(tenant.email);
  await page.getByPlaceholder("Enter your password").fill(tenant.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await page.goto("/dashboard/blog");
  await page.waitForLoadState("networkidle");
  await installPreviewLoadCounter(page);

  const firstGroup = `${tenant.runId} family visits`;
  const secondGroup = `${tenant.runId} care at home`;
  const firstPost = `${tenant.runId} first visit`;
  const secondPost = `${tenant.runId} family questions`;
  const thirdPost = `${tenant.runId} brushing routine`;
  const editedGroup = `${tenant.runId} comfortable visits`;
  const editedPost = `${tenant.runId} visit checklist`;

  for (const groupName of [firstGroup, secondGroup]) {
    await expectOnePreviewReload(page, async () => {
      await page.getByRole("button", { name: "Add blog group" }).click();
      await page.getByLabel("Group name").fill(groupName);
      await page
        .getByRole("button", { name: "Add group", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: groupName }),
      ).toBeVisible();
    });
  }

  for (const [groupName, title] of [
    [firstGroup, firstPost],
    [firstGroup, secondPost],
    [secondGroup, thirdPost],
  ] as const) {
    await expectOnePreviewReload(page, async () => {
      await page
        .getByRole("button", { name: `Add blog to ${groupName}` })
        .click();
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

  const preview = page.frameLocator("#myIframe");
  const previewBlogs = preview.locator(
    '[data-profile-module="trust-first-family-blogs"]',
  );
  await expect(previewBlogs.getByRole("link")).toHaveText([
    firstPost,
    secondPost,
    thirdPost,
  ]);

  await expectOnePreviewReload(page, async () => {
    await page
      .getByRole("button", { name: `Edit group ${firstGroup}` })
      .click();
    await page.getByLabel("Group name").fill(editedGroup);
    await page.getByRole("button", { name: "Update group" }).click();
    await expect(
      page.getByRole("heading", { name: editedGroup }),
    ).toBeVisible();
  });
  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: `Edit ${firstPost}` }).click();
    await page.getByLabel("Blog title").fill(editedPost);
    await page.getByRole("button", { name: "Update blog" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedPost}` }),
    ).toBeVisible();
  });
  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: `Move ${editedPost} down` }).click();
    await page.getByRole("button", { name: "Save blog order" }).click();
  });
  await expectOnePreviewReload(page, async () => {
    await page
      .getByRole("button", { name: `Move ${editedGroup} down` })
      .click();
    await page.getByRole("button", { name: "Save group order" }).click();
  });
  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: `Delete ${secondPost}` }).click();
    await page
      .getByRole("alertdialog", { name: "Delete blog?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${secondPost}` }),
    ).toHaveCount(0);
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: editedGroup })).toBeVisible();
  await expect(
    preview.locator(
      '[data-profile-module="trust-first-family-blogs"] [data-blog-group-id] h2',
    ),
  ).toHaveText([secondGroup, editedGroup]);
  await expect(
    preview.locator('[data-profile-module="trust-first-family-blogs"] a'),
  ).toHaveText([thirdPost, editedPost]);
});
