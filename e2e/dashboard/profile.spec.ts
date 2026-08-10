import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

test.describe("profile and socials", () => {
  test("validates, saves, uploads, reloads, and deletes profile content", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await expect(page.getByTestId("profile-manager")).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .include('[data-testid="profile-manager"]')
      .analyze();
    expect(
      scan.violations.filter(({ impact }) => impact === "critical"),
    ).toEqual([]);

    const title = `${tenant.runId} profile`;
    await page.getByLabel("Profile title").fill(title);
    await page.getByLabel("Website (optional)").fill("javascript:bad");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByLabel("Website (optional)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("Profile title")).toHaveValue(title);
    await page
      .getByLabel("Website (optional)")
      .fill("https://example.test/profile");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByRole("status")).toContainText("Profile saved");

    const handle = `dbio${tenant.runId.slice(-8).replace(/[^a-z0-9]/g, "")}`;
    await page.getByLabel("X profile (optional)").fill(`@${handle}`);
    await page.getByLabel("Other link").fill("https://example.test/social");
    await page.getByRole("button", { name: "Save social links" }).click();
    await expect(
      page.getByText("Social links saved", { exact: true }),
    ).toBeVisible();

    await page.getByLabel("Choose profile picture").setInputFiles({
      name: "profile.png",
      mimeType: "image/png",
      buffer: await import("node:fs").then(({ readFileSync }) =>
        readFileSync("public/profile.webp"),
      ),
    });
    const cropDialog = page.getByRole("dialog", {
      name: "Crop profile picture",
    });
    await expect(cropDialog).toBeVisible();
    await expect(cropDialog.getByLabel("Profile picture zoom")).toBeVisible();
    const cropScan = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();
    expect(
      cropScan.violations.filter(({ impact }) => impact === "critical"),
    ).toEqual([]);
    await cropDialog.getByRole("button", { name: "Save picture" }).click();
    await expect(
      page.getByText("Profile picture uploaded and preview refreshed", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByAltText("Current profile picture")).toBeVisible();
    await expect(
      page
        .frameLocator("#myIframe")
        .locator('img[width="112"][src*="/profile-pics/"]'),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Profile title")).toHaveValue(title);
    await expect(page.getByLabel("X profile (optional)")).toHaveValue(
      `https://x.com/${handle}`,
    );
    await expect(page.getByAltText("Current profile picture")).toBeVisible();

    await page.getByRole("button", { name: "Delete picture" }).click();
    const dialog = page.getByRole("alertdialog", {
      name: "Delete profile picture?",
    });
    const dialogScan = await new AxeBuilder({ page })
      .include('[role="alertdialog"]')
      .analyze();
    expect(
      dialogScan.violations.filter(({ impact }) => impact === "critical"),
    ).toEqual([]);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("button", { name: "Delete picture" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Delete picture" }).click();
    await dialog.getByRole("button", { name: "Delete picture" }).click();
    await expect(
      page.getByText("Profile picture deleted and preview refreshed", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page
        .frameLocator("#myIframe")
        .locator('img[width="112"][src*="/placeholder.webp"]'),
    ).toBeVisible();
  });

  test("preserves a profile draft after controlled authorization failure", async ({
    dashboardPage: page,
    tenant,
  }) => {
    const admin = await createAdminClient();
    const { error } = await admin
      .from("dentistries")
      .delete()
      .eq("user_id", tenant.userId);
    expect(error).toBeNull();
    const draft = `${tenant.runId} preserved draft`;
    await page.getByLabel("Profile title").fill(draft);
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(
      page.getByRole("heading", { name: "Could not save profile" }),
    ).toBeVisible();
    await expect(page.getByLabel("Profile title")).toHaveValue(draft);
  });

  test("denies an owner reading another profile target", async ({
    dashboardPage: page,
    tenant,
  }) => {
    const admin = await createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: `${tenant.runId}-profile-other@example.test`,
      password: `Dbio-${crypto.randomUUID()}!`,
      email_confirm: true,
      user_metadata: {
        username: `${tenant.username}-profile-other`.slice(0, 30),
        first_name: "Other",
        last_name: "Profile",
      },
    });
    if (error || !data.user)
      throw error ?? new Error("Cross-owner fixture returned no user");
    try {
      const response = await page.request.get(
        `/api/profile?targetUserId=${data.user.id}`,
      );
      expect(response.status()).toBe(403);
    } finally {
      await admin.from("users").delete().eq("id", data.user.id);
      await admin.auth.admin.deleteUser(data.user.id);
    }
  });
});
