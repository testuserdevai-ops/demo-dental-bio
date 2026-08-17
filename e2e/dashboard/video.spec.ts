import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

async function installPreviewLoadCounter(page: Page) {
  await expect(page.locator("#myIframe")).toBeAttached();
  await page.frameLocator("#myIframe").locator("body").waitFor();
  await page.evaluate(() => {
    const state = window as typeof window & { videoPreviewLoads?: number };
    state.videoPreviewLoads = 0;
    document.querySelector("#myIframe")?.addEventListener("load", () => {
      state.videoPreviewLoads = (state.videoPreviewLoads ?? 0) + 1;
    });
  });
}

async function previewLoadCount(page: Page) {
  return page.evaluate(
    () =>
      (window as typeof window & { videoPreviewLoads?: number })
        .videoPreviewLoads ?? 0,
  );
}

async function expectOnePreviewReload(page: Page, action: () => Promise<void>) {
  const before = await previewLoadCount(page);
  await action();
  await expect.poll(() => previewLoadCount(page)).toBe(before + 1);
  expect(await previewLoadCount(page)).toBe(before + 1);
}

test("video mutations reload preview once and retain rejected drafts", async ({
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
  await installPreviewLoadCounter(page);

  const firstGroup = `${tenant.runId} video guides`;
  const secondGroup = `${tenant.runId} video updates`;
  const editedGroup = `${firstGroup} edited`;
  const firstVideo = `${tenant.runId} first video`;
  const editedVideo = `${firstVideo} edited`;
  const secondVideo = `${tenant.runId} second video`;

  await page.getByRole("button", { name: "Add video group" }).click();
  await page.getByRole("button", { name: "Add group", exact: true }).click();
  await expect(page.getByLabel("Group name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(await previewLoadCount(page)).toBe(0);

  await page.getByLabel("Group name").fill(firstGroup);
  const admin = await createAdminClient();
  const { error: revokePlanError } = await admin
    .from("users")
    .update({
      subscription_status: null,
      trial_end: new Date(0).toISOString(),
    })
    .eq("id", tenant.userId);
  expect(revokePlanError).toBeNull();
  try {
    await page.getByRole("button", { name: "Add group", exact: true }).click();
    await expect(page.getByText("Could not save group").first()).toBeVisible();
    await expect(page.getByLabel("Group name")).toHaveValue(firstGroup);
    expect(await previewLoadCount(page)).toBe(0);
  } finally {
    const { error: restorePlanError } = await admin
      .from("users")
      .update({
        subscription_status: "PREMIUM PRO",
        trial_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .eq("id", tenant.userId);
    expect(restorePlanError).toBeNull();
  }

  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: "Add group", exact: true }).click();
    await expect(page.getByRole("heading", { name: firstGroup })).toBeVisible();
  });

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

  await page
    .getByRole("button", { name: `Add video to ${editedGroup}` })
    .click();
  await page.getByLabel("Video title").fill(firstVideo);
  await page.getByLabel("Video URL").fill("https://example.test/not-video");
  await page.getByRole("button", { name: "Add video", exact: true }).click();
  await expect(page.getByLabel("Video URL")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("Video title")).toHaveValue(firstVideo);
  expect(await previewLoadCount(page)).toBe(2);
  await page
    .getByLabel("Video URL")
    .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: "Add video", exact: true }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${firstVideo}` }),
    ).toBeVisible();
  });

  await expectOnePreviewReload(page, async () => {
    await page
      .getByRole("button", { name: `Add video to ${editedGroup}` })
      .click();
    await page.getByLabel("Video title").fill(secondVideo);
    await page
      .getByLabel("Video URL")
      .fill("https://www.youtube.com/watch?v=9bZkp7q19f0");
    await page.getByRole("button", { name: "Add video", exact: true }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${secondVideo}` }),
    ).toBeVisible();
  });

  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: `Edit ${firstVideo}` }).click();
    await page.getByLabel("Video title").fill(editedVideo);
    await page.getByRole("button", { name: "Update video" }).click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedVideo}` }),
    ).toBeVisible();
  });
  await expectOnePreviewReload(page, async () => {
    await page
      .getByRole("button", { name: `Move ${editedVideo} down` })
      .click();
    await page.getByRole("button", { name: "Save video order" }).click();
  });
  await expectOnePreviewReload(page, async () => {
    await page.getByRole("switch", { name: `Hide ${editedVideo}` }).click();
    await expect(
      page.getByRole("switch", { name: `Show ${editedVideo}` }),
    ).toBeVisible();
  });

  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: "Add video group" }).click();
    await page.getByLabel("Group name").fill(secondGroup);
    await page.getByRole("button", { name: "Add group", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: secondGroup }),
    ).toBeVisible();
  });
  await expectOnePreviewReload(page, async () => {
    await page
      .getByRole("button", { name: `Move ${editedGroup} down` })
      .click();
    await page.getByRole("button", { name: "Save group order" }).click();
  });
  await expectOnePreviewReload(page, async () => {
    await page
      .getByRole("switch", { name: `Hide group ${editedGroup}` })
      .click();
    await expect(
      page.getByRole("switch", { name: `Show group ${editedGroup}` }),
    ).toBeVisible();
  });

  await page.reload();
  const persistedGroupOrder = await page
    .locator('[data-testid="video-manager"] > section > header h3')
    .allTextContents();
  expect(persistedGroupOrder).toEqual([secondGroup, editedGroup]);
  const persistedVideoOrder = await page
    .getByRole("heading", { name: editedGroup })
    .locator("xpath=ancestor::section[1]")
    .locator('article button[aria-label^="Edit "]')
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label")),
    );
  expect(persistedVideoOrder).toEqual([
    `Edit ${secondVideo}`,
    `Edit ${editedVideo}`,
  ]);
  await expect(
    page.getByRole("switch", { name: `Show group ${editedGroup}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: `Show ${editedVideo}` }),
  ).toBeVisible();
  await installPreviewLoadCounter(page);

  const beforeCancel = await previewLoadCount(page);
  await page.getByRole("button", { name: `Delete ${editedVideo}` }).click();
  await page
    .getByRole("alertdialog", { name: "Delete video?" })
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(
    page.getByRole("button", { name: `Edit ${editedVideo}` }),
  ).toBeVisible();
  expect(await previewLoadCount(page)).toBe(beforeCancel);

  await expectOnePreviewReload(page, async () => {
    await page.getByRole("button", { name: `Delete ${editedVideo}` }).click();
    await page
      .getByRole("alertdialog", { name: "Delete video?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedVideo}` }),
    ).toHaveCount(0);
  });
  await expectOnePreviewReload(page, async () => {
    await page
      .getByRole("button", { name: `Delete group ${secondGroup}` })
      .click();
    await page
      .getByRole("alertdialog", { name: "Delete video group?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: secondGroup })).toHaveCount(
      0,
    );
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: editedGroup })).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Edit ${secondVideo}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Edit ${editedVideo}` }),
  ).toHaveCount(0);
});
