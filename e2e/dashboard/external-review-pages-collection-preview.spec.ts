import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

const VISIBLE_TIMEOUT_MS = 15_000;

test("external review pages persist as one ordered collection with exact preview reloads", async ({
  dashboardPage: page,
  tenant,
}) => {
  test.setTimeout(120_000);
  const admin = await createAdminClient();
  const preview = page.locator("#myIframe");
  const hosts = [
    "review-one.example",
    "review-two.example",
    "review-three.example",
    "review-four.example",
  ];
  const links = hosts.map((host) => `https://${host}/${tenant.runId}`);

  const installReloadCounter = () =>
    page.evaluate(() => {
      const iframe = document.querySelector<HTMLIFrameElement>("#myIframe");
      const srcDescriptor = Object.getOwnPropertyDescriptor(
        HTMLIFrameElement.prototype,
        "src",
      );
      if (!iframe || !srcDescriptor?.get || !srcDescriptor.set) {
        throw new Error("Cannot instrument the external-review preview iframe");
      }
      sessionStorage.setItem("externalReviewPreviewLoads", "0");
      Object.defineProperty(iframe, "src", {
        configurable: true,
        enumerable: srcDescriptor.enumerable,
        get: () => srcDescriptor.get?.call(iframe),
        set: (value: string) => {
          const loads = Number(
            sessionStorage.getItem("externalReviewPreviewLoads") ?? "0",
          );
          sessionStorage.setItem(
            "externalReviewPreviewLoads",
            String(loads + 1),
          );
          srcDescriptor.set?.call(iframe, value);
        },
      });
    });
  const reloads = async () => {
    await page.waitForLoadState("domcontentloaded");
    return page.evaluate(() =>
      Number(sessionStorage.getItem("externalReviewPreviewLoads") ?? "0"),
    );
  };
  const expectOneReload = async (action: () => Promise<void>) => {
    await installReloadCounter();
    const before = await reloads();
    await action();
    await expect.poll(reloads, { timeout: 10_000 }).toBe(before + 1);
    await page.waitForTimeout(150);
    expect(await reloads()).toBe(before + 1);
  };
  const publicExternalLinks = () =>
    preview
      .contentFrame()
      .locator(
        '[data-profile-module$="-reviews"] [data-external-review-page-id]',
      );

  await page.goto("/dashboard/review");
  await expect(
    page.locator('[data-testid="external-review-pages-manager"]'),
  ).toBeVisible({ timeout: VISIBLE_TIMEOUT_MS });
  await expect(preview).toBeAttached();
  await preview.contentFrame().locator("body").waitFor();
  await expect(
    preview.contentFrame().locator('[data-profile-template="basic"]'),
  ).toBeVisible();

  await installReloadCounter();
  const beforeInvalidSave = await reloads();
  await page.getByRole("button", { name: "Add external review page" }).click();
  await page
    .getByLabel("External review page URL")
    .fill("http://unsafe.example/reviews");
  await page.getByRole("button", { name: "Save external review page" }).click();
  await expect(page.getByLabel("External review page URL")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.waitForTimeout(150);
  expect(await reloads()).toBe(beforeInvalidSave);
  await expect(page.getByLabel("External review page URL")).toHaveValue(
    "http://unsafe.example/reviews",
  );
  await page.keyboard.press("Escape");

  for (const [index, link] of links.entries()) {
    await expectOneReload(async () => {
      await page
        .getByRole("button", { name: "Add external review page" })
        .click();
      await page.getByLabel("External review page URL").fill(link);
      await page
        .getByRole("button", { name: "Save external review page" })
        .click();
      await expect(
        page.getByRole("button", { name: `Edit ${hosts[index]}` }),
      ).toBeVisible({ timeout: VISIBLE_TIMEOUT_MS });
    });
    await expect(publicExternalLinks()).toHaveCount(index + 1);
  }

  const editedHost = "edited-one.example";
  const editedLink = `https://${editedHost}/${tenant.runId}/updated`;
  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Edit ${hosts[0]}` }).click();
    await page.getByLabel("External review page URL").fill(editedLink);
    await page
      .getByRole("button", { name: "Update external review page" })
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedHost}` }),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT_MS });
  });

  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Hide ${hosts[1]}` }).click();
    await expect(
      page.getByRole("button", { name: `Show ${hosts[1]}` }),
    ).toBeVisible({ timeout: VISIBLE_TIMEOUT_MS });
  });
  await expect(publicExternalLinks()).toHaveCount(3);

  await page.getByRole("button", { name: `Move ${hosts[3]} up` }).click();
  await expectOneReload(async () => {
    await page
      .getByRole("button", { name: "Save external review page order" })
      .click();
  });
  await expect(publicExternalLinks()).toHaveText([
    editedHost,
    hosts[3],
    hosts[2],
  ]);
  expect(
    await publicExternalLinks().evaluateAll((nodes) =>
      nodes.map((node) =>
        Number(node.getAttribute("data-external-review-position")),
      ),
    ),
  ).toEqual([1, 2, 3]);

  await page.reload();
  await expect(
    page.getByRole("button", { name: `Edit ${editedHost}` }),
  ).toBeVisible({ timeout: VISIBLE_TIMEOUT_MS });
  await preview.contentFrame().locator("body").waitFor();
  await expect(publicExternalLinks()).toHaveText([
    editedHost,
    hosts[3],
    hosts[2],
  ]);

  await page.goto("/onboarding/appearance?step=template");
  await page
    .getByRole("radio", { name: /^Clinic and Commerce/ })
    .locator("xpath=ancestor::label")
    .click();
  const confirmation = page.getByRole("checkbox", {
    name: /I understand and want to clear/i,
  });
  if (await confirmation.isVisible()) await confirmation.check();
  await page
    .getByRole("button", { name: "Save template and continue to questions" })
    .click();
  await expect(page).toHaveURL(
    /\/onboarding\/questions\?template=clinic-commerce$/,
    { timeout: VISIBLE_TIMEOUT_MS },
  );
  await expect
    .poll(async () => {
      const [userResult, projectionResult] = await Promise.all([
        admin
          .from("users")
          .select(
            "profile_presentation_published, profile_presentation_published_revision",
          )
          .eq("id", tenant.userId)
          .single(),
        admin
          .from("public_profiles")
          .select("profile_presentation, profile_presentation_revision")
          .eq("profile_id", tenant.userId)
          .single(),
      ]);
      if (userResult.error) throw userResult.error;
      if (projectionResult.error) throw projectionResult.error;
      return {
        published: (
          userResult.data.profile_presentation_published as {
            templateId?: unknown;
          }
        ).templateId,
        projected: (
          projectionResult.data.profile_presentation as {
            templateId?: unknown;
          }
        ).templateId,
        revisionMatches:
          userResult.data.profile_presentation_published_revision ===
          projectionResult.data.profile_presentation_revision,
      };
    })
    .toEqual({
      published: "clinic-commerce",
      projected: "clinic-commerce",
      revisionMatches: true,
    });

  await page.goto("/dashboard/review");
  await expect(
    page.locator('[data-testid="external-review-pages-manager"]'),
  ).toBeVisible({ timeout: VISIBLE_TIMEOUT_MS });
  await preview.contentFrame().locator("body").waitFor();
  await expect(
    preview.contentFrame().locator('[data-profile-template="clinic-commerce"]'),
  ).toBeVisible();
  await expect(publicExternalLinks()).toHaveText([
    editedHost,
    hosts[3],
    hosts[2],
  ]);

  await installReloadCounter();
  const beforeCancelledDelete = await reloads();
  await page.getByRole("button", { name: `Delete ${hosts[3]}` }).click();
  await page
    .getByRole("alertdialog", { name: "Delete external review page?" })
    .getByRole("button", { name: "Cancel" })
    .click();
  await page.waitForTimeout(150);
  expect(await reloads()).toBe(beforeCancelledDelete);

  await expectOneReload(async () => {
    await page.getByRole("button", { name: `Delete ${editedHost}` }).click();
    await page
      .getByRole("alertdialog", { name: "Delete external review page?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Edit ${editedHost}` }),
    ).toHaveCount(0);
  });
  await expect(publicExternalLinks()).toHaveText([hosts[3], hosts[2]]);

  await page.setViewportSize({ width: 390, height: 844 });
  const scan = await new AxeBuilder({ page })
    .include('[data-testid="external-review-pages-manager"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
