import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

async function installPreviewLoadCounter(page: Page) {
  await expect(page.locator("#myIframe")).toBeAttached();
  await page.frameLocator("#myIframe").locator("body").waitFor();
  await page.evaluate(() => {
    const state = window as typeof window & {
      locationRouterBlogLoads?: number;
    };
    state.locationRouterBlogLoads = 0;
    document.querySelector("#myIframe")?.addEventListener("load", () => {
      state.locationRouterBlogLoads = (state.locationRouterBlogLoads ?? 0) + 1;
    });
  });
}

async function expectOnePreviewReload(page: Page, action: () => Promise<void>) {
  const before = await page.evaluate(
    () =>
      (window as typeof window & { locationRouterBlogLoads?: number })
        .locationRouterBlogLoads ?? 0,
  );
  await action();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { locationRouterBlogLoads?: number })
            .locationRouterBlogLoads ?? 0,
      ),
    )
    .toBe(before + 1);
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { locationRouterBlogLoads?: number })
          .locationRouterBlogLoads ?? 0,
    ),
  ).toBe(before + 1);
}

test("Location Router blog mutations reload once and persist ordered preview content", async ({
  dashboardPage: page,
  tenant,
}) => {
  const admin = await createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      profile_presentation_published: {
        schemaVersion: 1,
        templateId: "location-provider-router",
        themeId: "warm-care",
        layoutVariant: "classic-stack",
        answers: { routerKind: "location" },
      },
    })
    .eq("id", tenant.userId);
  expect(error).toBeNull();

  await page.goto("/dashboard/blog");
  await installPreviewLoadCounter(page);

  const firstGroup = `${tenant.runId} practice notes`;
  const secondGroup = `${tenant.runId} care guides`;
  const firstPost = `${tenant.runId} first appointment`;
  const secondPost = `${tenant.runId} visit planning`;
  const thirdPost = `${tenant.runId} routine check-up`;
  const editedGroup = `${tenant.runId} owner notes`;
  const editedPost = `${tenant.runId} appointment checklist`;

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
  await expect(
    preview.getByRole("heading", { name: firstGroup, level: 2 }),
  ).toBeVisible();
  await expect(preview.getByRole("link", { name: secondPost })).toBeVisible();
  await expect(preview.getByRole("link", { name: thirdPost })).toBeVisible();

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
  await expect(
    preview.getByRole("heading", { name: editedGroup, level: 2 }),
  ).toBeVisible();

  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: `Edit ${firstPost}` }).click();
    await page.getByLabel("Blog title").fill(editedPost);
    await page.getByRole("button", { name: "Update blog" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedPost}` }),
    ).toBeVisible();
  });
  await expect(preview.getByRole("link", { name: editedPost })).toBeVisible();

  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: `Move ${editedPost} down` }).click();
    await page.getByRole("button", { name: "Save blog order" }).click();
  });
  await expect(
    preview
      .locator(`[data-blog-group] [data-blog-post]`)
      .evaluateAll((links) => links.map((link) => link.textContent?.trim())),
  ).resolves.toEqual([secondPost, editedPost]);

  await expectOnePreviewReload(page, async () => {
    await page
      .getByRole("button", { name: `Move ${editedGroup} down` })
      .click();
    await page.getByRole("button", { name: "Save group order" }).click();
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: editedGroup })).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Edit ${editedPost}` }),
  ).toBeVisible();
  await expect(
    preview
      .locator("[data-blog-group]")
      .evaluateAll((groups) =>
        groups.map((group) => group.querySelector("h2")?.textContent?.trim()),
      ),
  ).resolves.toEqual([secondGroup, editedGroup]);
  await expect(
    preview
      .locator(`[data-blog-group] [data-blog-post]`)
      .evaluateAll((links) => links.map((link) => link.textContent?.trim())),
  ).resolves.toEqual([secondPost, editedPost]);
});
