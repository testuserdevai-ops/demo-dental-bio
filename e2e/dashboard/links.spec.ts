import { test, expect } from "../fixtures/dashboard";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAdminClient } from "../support/test-environment";

async function openLinks(page: Page) {
  await page.getByRole("link", { name: "Links", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/links(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Links" })).toBeVisible();
}

async function addGroup(page: Page, heading: string) {
  await page.getByRole("button", { name: "Add New Group" }).click();
  await page.getByLabel("New group heading").fill(heading);
  await page.getByRole("button", { name: "Add group" }).click();
  await expect(page.getByRole("region", { name: heading })).toBeVisible();
}

async function addLink(page: Page, group: string, title: string, url: string) {
  const region = page.getByRole("region", { name: group });
  await region.getByRole("button", { name: `Add link to ${group}` }).click();
  await region.getByLabel("New link title").fill(title);
  await region.getByLabel("URL").fill(url);
  await region.getByRole("button", { name: "Add link" }).click();
  await expect(region.getByText(title, { exact: true })).toBeVisible();
}

test.describe("links and link groups", () => {
  test("route and delete dialog have no critical accessibility violations", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await openLinks(page);
    const routeScan = await new AxeBuilder({ page })
      .include('[data-testid="links-manager"]')
      .analyze();
    expect(
      routeScan.violations.filter(({ impact }) => impact === "critical"),
    ).toEqual([]);
    const group = `${tenant.runId} accessible group`;
    await addGroup(page, group);
    const deleteGroup = page
      .getByRole("region", { name: group })
      .getByRole("button", { name: `Delete group ${group}` });
    await deleteGroup.focus();
    await deleteGroup.press("Enter");
    const dialogScan = await new AxeBuilder({ page })
      .include('[role="alertdialog"]')
      .analyze();
    expect(
      dialogScan.violations.filter(({ impact }) => impact === "critical"),
    ).toEqual([]);
    await page
      .getByRole("alertdialog", { name: "Delete link group?" })
      .getByRole("button", { name: "Cancel" })
      .click();
  });

  test("validates, creates, orders, edits, toggles, deletes, and reloads", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await openLinks(page);
    await expect(page.getByText("No link groups yet.")).toBeVisible();

    await page.getByRole("button", { name: "Add New Group" }).click();
    const groupHeading = page.getByLabel("New group heading");
    await page.getByRole("button", { name: "Add group" }).click();
    await expect(groupHeading).toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(groupHeading).toBeHidden();

    const firstGroup = `${tenant.runId} resources`;
    const secondGroup = `${tenant.runId} profiles`;
    await addGroup(page, firstGroup);
    await addGroup(page, secondGroup);

    const firstLink = `${tenant.runId} website`;
    const secondLink = `${tenant.runId} booking`;
    const firstRegion = page.getByRole("region", { name: firstGroup });
    await firstRegion
      .getByRole("button", { name: `Add link to ${firstGroup}` })
      .click();
    await firstRegion.getByRole("button", { name: "Add link" }).click();
    await expect(firstRegion.getByLabel("New link title")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await firstRegion.getByLabel("New link title").fill(firstLink);
    await firstRegion.getByLabel("URL").fill("not a url");
    await firstRegion.getByRole("button", { name: "Add link" }).click();
    await expect(firstRegion.getByLabel("URL")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await firstRegion.getByLabel("URL").fill("example.test/path");
    await firstRegion.getByRole("button", { name: "Add link" }).click();
    await expect(
      firstRegion.getByText(firstLink, { exact: true }),
    ).toBeVisible();
    await expect(
      firstRegion.getByText("https://example.test/path", { exact: true }),
    ).toBeVisible();
    await addLink(page, firstGroup, secondLink, "https://example.test/book");

    await firstRegion
      .getByRole("button", { name: `Move ${firstLink} down` })
      .click();
    await expect(
      firstRegion.getByText(`${firstLink} moved to position 2`),
    ).toBeVisible();
    await firstRegion.getByRole("button", { name: "Save link order" }).click();
    await expect(firstRegion.getByText("Link order saved")).toBeVisible();

    await page.getByRole("button", { name: `Move ${firstGroup} down` }).click();
    await expect(
      page.getByText(`${firstGroup} moved to position 2`),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: firstGroup, exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Save group order" }).click();
    await expect(page.getByText("Link group order saved")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("region", { name: firstGroup })).toBeVisible();
    expect(
      await page
        .locator("section[aria-labelledby] h3")
        .evaluateAll((headings) =>
          headings.map((heading) => heading.textContent),
        ),
    ).toEqual([secondGroup, firstGroup]);
    expect(
      await page
        .getByRole("region", { name: firstGroup })
        .locator("div.rounded-xl.border p.font-semibold")
        .evaluateAll((titles) => titles.map((title) => title.textContent)),
    ).toEqual([secondLink, firstLink]);

    const region = page.getByRole("region", { name: firstGroup });
    await region.getByRole("button", { name: `Edit ${firstLink}` }).click();
    const editedLink = `${firstLink} updated`;
    await region.getByLabel("Link title").fill(editedLink);
    await region.getByRole("button", { name: "Update link" }).click();
    await expect(region.getByText(editedLink, { exact: true })).toBeVisible();
    await region.getByRole("button", { name: `Disable ${editedLink}` }).click();
    await expect(
      region.getByRole("button", { name: `Enable ${editedLink}` }),
    ).toBeVisible();

    await region.getByRole("button", { name: `Delete ${editedLink}` }).click();
    const linkDialog = page.getByRole("alertdialog", { name: "Delete link?" });
    await expect(linkDialog).toContainText(editedLink);
    await linkDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(
      region.getByRole("button", { name: `Delete ${editedLink}` }),
    ).toBeFocused();
    await region.getByRole("button", { name: `Delete ${editedLink}` }).click();
    await linkDialog.getByRole("button", { name: "Delete link" }).click();
    await expect(region.getByText(editedLink, { exact: true })).toBeHidden();

    await region
      .getByRole("button", { name: `Delete group ${firstGroup}` })
      .click();
    const groupDialog = page.getByRole("alertdialog", {
      name: "Delete link group?",
    });
    await groupDialog.getByRole("button", { name: "Delete group" }).click();
    await expect(page.getByRole("region", { name: firstGroup })).toBeHidden();
    await page.reload();
    await expect(page.getByRole("region", { name: firstGroup })).toHaveCount(0);
  });

  test("preserves a draft after a controlled authorization failure", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await openLinks(page);
    const admin = await createAdminClient();
    const { error } = await admin
      .from("dentistries")
      .delete()
      .eq("user_id", tenant.userId);
    expect(error).toBeNull();
    await page.getByRole("button", { name: "Add New Group" }).click();
    const heading = `${tenant.runId} preserved group`;
    await page.getByLabel("New group heading").fill(heading);
    await page.getByRole("button", { name: "Add group" }).click();
    await expect(
      page.getByRole("heading", { name: "Could not save group" }),
    ).toBeVisible();
    await expect(page.getByLabel("New group heading")).toHaveValue(heading);
  });

  test("denies an owner reading another dashboard target", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await openLinks(page);
    const admin = await createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: `${tenant.runId}-links-other@example.test`,
      password: `Dbio-${crypto.randomUUID()}!`,
      email_confirm: true,
      user_metadata: {
        username: `${tenant.username}-links-other`.slice(0, 30),
        first_name: "Other",
        last_name: "Owner",
      },
    });
    if (error || !data.user)
      throw error ?? new Error("Cross-owner fixture returned no user");
    try {
      const response = await page.request.get(
        `/api/links?targetUserId=${data.user.id}`,
      );
      expect(response.status()).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "Unable to load links",
      });
    } finally {
      await admin.from("users").delete().eq("id", data.user.id);
      await admin.auth.admin.deleteUser(data.user.id);
    }
  });
});
