import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

async function installPreviewLoadCounter(page: Page) {
  await expect(page.locator("#myIframe")).toBeAttached();
  await page.frameLocator("#myIframe").locator("body").waitFor();
  await page.evaluate(() => {
    const state = window as typeof window & { directBookingBlogLoads?: number };
    state.directBookingBlogLoads = 0;
    document.querySelector("#myIframe")?.addEventListener("load", () => {
      state.directBookingBlogLoads = (state.directBookingBlogLoads ?? 0) + 1;
    });
  });
}

async function expectOnePreviewReload(page: Page, action: () => Promise<void>) {
  const before = await page.evaluate(
    () =>
      (window as typeof window & { directBookingBlogLoads?: number })
        .directBookingBlogLoads ?? 0,
  );
  await action();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { directBookingBlogLoads?: number })
            .directBookingBlogLoads ?? 0,
      ),
    )
    .toBe(before + 1);
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { directBookingBlogLoads?: number })
          .directBookingBlogLoads ?? 0,
    ),
  ).toBe(before + 1);
}

test("Direct Booking blog mutations reload once and persist ordered preview content", async ({
  page,
  tenant,
}) => {
  const admin = await createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      profile_presentation_published: {
        schemaVersion: 1,
        templateId: "direct-booking",
        themeId: "modern-specialist",
        layoutVariant: "classic-stack",
        answers: { primaryAction: "booking", secondaryAction: "website" },
      },
    })
    .eq("id", tenant.userId);
  expect(error).toBeNull();

  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(tenant.email);
  await page.getByPlaceholder("Enter your password").fill(tenant.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await page.goto("/dashboard/blog");
  await installPreviewLoadCounter(page);

  const firstGroup = `${tenant.runId} appointment guides`;
  const secondGroup = `${tenant.runId} aftercare`;
  const firstPost = `${tenant.runId} first appointment`;
  const secondPost = `${tenant.runId} booking questions`;
  const thirdPost = `${tenant.runId} aftercare checklist`;
  const editedGroup = `${tenant.runId} visit guides`;
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
  const previewBlogs = preview.locator(
    '[data-profile-module="direct-booking-blogs"]',
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
    preview
      .locator(
        '[data-profile-module="direct-booking-blogs"] [data-blog-group-id]',
      )
      .evaluateAll((groups) =>
        groups.map((group) => group.querySelector("h2")?.textContent?.trim()),
      ),
  ).resolves.toEqual([secondGroup, editedGroup]);
  await expect(
    preview
      .locator('[data-profile-module="direct-booking-blogs"] a')
      .allTextContents(),
  ).resolves.toEqual([thirdPost, editedPost]);
});
