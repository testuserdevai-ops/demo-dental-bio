import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { waitForMailpitCode } from "./support/mailpit";
import { createAdminClient } from "./support/test-environment";

const runId = `account-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const email = `${runId}@example.com`;
const username = runId.replace(/[^a-z0-9_-]/g, "").slice(0, 30);
const originalPassword = `Original-${crypto.randomUUID()}!1aA`;
const replacementPassword = `Replacement-${crypto.randomUUID()}!1aA`;
let userId: string;
const userDentistryId = crypto.randomUUID();
const adminEmail = `admin-${runId}@example.com`;
const adminPassword = `Admin-${crypto.randomUUID()}!1aA`;
let adminUserId: string;
const adminDentistryId = crypto.randomUUID();

test.describe.serial("account entry and recovery", () => {
  test.beforeAll(async () => {
    const admin = await createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: originalPassword,
      email_confirm: true,
      user_metadata: {
        username,
        first_name: "Account",
        last_name: "Test",
        registered_domain: "dental.bio",
      },
    });
    if (error || !data.user) {
      throw error ?? new Error("Account E2E user creation returned no user");
    }
    userId = data.user.id;

    const { data: adminData, error: adminError } =
      await admin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          username: `admin-${username}`.slice(0, 30),
          first_name: "Admin",
          last_name: "Test",
        },
      });
    if (adminError || !adminData.user) {
      throw adminError ?? new Error("Admin E2E user creation returned no user");
    }
    adminUserId = adminData.user.id;

    let roleUpdated = false;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { data: updated, error: roleError } = await admin
        .from("users")
        .update({ role: "admin" })
        .eq("id", adminUserId)
        .select("id")
        .maybeSingle();
      if (roleError) throw roleError;
      if (updated) {
        roleUpdated = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!roleUpdated) throw new Error("Admin E2E profile was not initialized");

    const { error: dentistryError } = await admin.from("dentistries").insert([
      { dentistry_id: userDentistryId, user_id: userId },
      { dentistry_id: adminDentistryId, user_id: adminUserId },
    ]);
    if (dentistryError) throw dentistryError;
  });

  test.afterAll(async () => {
    if (!userId) return;
    const admin = await createAdminClient();
    for (const id of [userId, adminUserId].filter(Boolean)) {
      await admin.from("users").delete().eq("id", id);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
    }
  });

  test("normal login preserves errors and succeeds with valid credentials", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Incorrect-password!1aA");
    await page.getByRole("button", { name: "Log In" }).click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Unable to sign in with those credentials." }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(email);

    await page.getByLabel("Password").fill(originalPassword);
    await page.getByRole("button", { name: "Log In" }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    await expect(
      page.getByRole("link", { name: "Switch to Admin dashboard" }),
    ).toHaveCount(0);
  });

  test("normal login explains and expires its temporary lockout", async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-08-03T20:00:00.000Z") });
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Incorrect-password!1aA");

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.getByRole("button", { name: "Log In" }).click();
      if (attempt < 2) {
        await expect(
          page
            .getByRole("alert")
            .filter({ hasText: "Unable to sign in with those credentials." }),
        ).toBeVisible();
      }
    }

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Please wait before trying again" }),
    ).toContainText("Too many unsuccessful attempts. Try again in 60 seconds.");
    await expect(
      page.getByRole("button", { name: "Try again in 60 seconds" }),
    ).toBeDisabled();

    await page.clock.runFor(60_000);

    await expect(page.getByRole("button", { name: "Log In" })).toBeEnabled();
    await expect(page.getByLabel("Email")).toHaveValue(email);
    await expect(page.getByLabel("Password")).toHaveValue(
      "Incorrect-password!1aA",
    );
  });

  test("admin login denies a non-admin without leaving a session", async ({
    page,
  }) => {
    await page.goto("/admin-login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(originalPassword);
    await page.getByRole("button", { name: "Log In" }).click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Unable to sign in to this account." }),
    ).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("admin login authorizes an admin by immutable user id", async ({
    page,
  }) => {
    await page.goto("/admin-login");
    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Password").fill(adminPassword);
    await page.getByRole("button", { name: "Log In" }).click();

    await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  });

  test("admin credentials use both login routes and switch between dashboards", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Password").fill(adminPassword);
    await page.getByRole("button", { name: "Log In" }).click();

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    const adminDashboardLink = page.getByRole("link", {
      name: "Switch to Admin dashboard",
    });
    await expect(adminDashboardLink).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .include('a[aria-label="Switch to Admin dashboard"]')
          .analyze()
      ).violations.filter(({ impact }) => impact === "critical"),
    ).toEqual([]);

    await adminDashboardLink.click();
    await expect(page).toHaveURL(/\/admin(?:\?|$)/);
    const userDashboardLink = page.getByRole("link", {
      name: "Switch to User dashboard",
    });
    await expect(userDashboardLink).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .include('a[aria-label="Switch to User dashboard"]')
          .analyze()
      ).violations.filter(({ impact }) => impact === "critical"),
    ).toEqual([]);

    await userDashboardLink.click();
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);

    await page.goto("/admin-login");
    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Password").fill(adminPassword);
    await page.getByRole("button", { name: "Log In" }).click();
    await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  });

  test("recovery verifies the Mailpit code and changes the password", async ({
    page,
  }) => {
    const requestedAfter = new Date(Date.now() - 1_000);
    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send recovery code" }).click();

    await expect(
      page.getByRole("group", { name: "Verification code" }),
    ).toBeVisible();
    const code = await waitForMailpitCode(email, { after: requestedAfter });

    const firstDigit = page.getByLabel("Verification code digit 1 of 6");
    await firstDigit.fill("000000");
    await page.getByRole("button", { name: "Verify code" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "invalid or has expired" }),
    ).toBeVisible();

    await firstDigit.fill(code);
    await page.getByRole("button", { name: "Verify code" }).click();
    await expect(
      page.getByRole("heading", { name: "Set a new password" }),
    ).toBeVisible();

    await page
      .getByLabel("New password", { exact: true })
      .fill(replacementPassword);
    await page.getByLabel("Confirm new password").fill(replacementPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(replacementPassword);
    await page.getByRole("button", { name: "Log In" }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  });
});

test("direct registration route shows the username claim form", async ({
  page,
}) => {
  await page.goto("/register");

  await expect(
    page.getByRole("heading", { name: "Choose your username" }),
  ).toBeVisible();
  await expect(page.getByLabel("Profile domain")).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Claim dental.bio/yourname" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveCount(0);
});

test("homepage claim composer stays stable and contained while typing", async ({
  page,
}) => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 0));

    const claimForm = page
      .locator(".hero-section form")
      .filter({ has: page.getByRole("button", { name: /^Claim / }) })
      .first();
    const username = claimForm.getByLabel("Username");
    const usernameField = username.locator("..");
    const button = claimForm.getByRole("button", { name: /^Claim / });

    await expect(claimForm).toBeVisible();
    await page.waitForTimeout(600);

    const before = {
      form: await claimForm.boundingBox(),
      username: await usernameField.boundingBox(),
      button: await button.boundingBox(),
    };
    await username.fill("thirty-character-profile-handle");
    const after = {
      form: await claimForm.boundingBox(),
      username: await usernameField.boundingBox(),
      button: await button.boundingBox(),
    };

    expect(before.form).not.toBeNull();
    expect(before.username).not.toBeNull();
    expect(before.button).not.toBeNull();
    expect(after.form).not.toBeNull();
    expect(after.username).not.toBeNull();
    expect(after.button).not.toBeNull();

    expect(after.form!.x).toBeGreaterThanOrEqual(0);
    expect(after.form!.x + after.form!.width).toBeLessThanOrEqual(
      viewport.width,
    );
    expect(Math.abs(after.form!.width - before.form!.width)).toBeLessThan(1);
    expect(
      Math.abs(after.username!.width - before.username!.width),
    ).toBeLessThan(1);
    expect(Math.abs(after.button!.width - before.button!.width)).toBeLessThan(
      1,
    );

    const horizontalGap =
      after.button!.x - (after.username!.x + after.username!.width);
    const verticalGap =
      after.button!.y - (after.username!.y + after.username!.height);
    expect(
      Math.max(horizontalGap, verticalGap),
      JSON.stringify({
        viewport,
        username: after.username,
        button: after.button,
      }),
    ).toBeGreaterThanOrEqual(8);

    const claimForms = page.locator('form:has(input[placeholder="yourname"])');
    await expect(claimForms).toHaveCount(3);
    for (const instance of await claimForms.all()) {
      const box = await instance.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(300);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
  }
});

test("claim and registration forms validate and deliver a local OTP", async ({
  page,
}) => {
  const registrationEmail = `registration-${runId}@example.com`;
  const registrationUsername = `reg-${username}`.slice(0, 30);
  const admin = await createAdminClient();

  try {
    await page.clock.install();
    await page.goto("/");
    const claimForm = page
      .locator("form:visible")
      .filter({
        has: page.getByRole("button", { name: /^Claim / }),
      })
      .first();
    await claimForm.getByLabel("Username").fill(registrationUsername);
    await claimForm.getByRole("button", { name: /^Claim / }).click();
    await expect(page).toHaveURL(
      new RegExp(`/register\\?.*username=${registrationUsername}`),
    );
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByRole("heading", { name: "Almost there" }),
    ).toBeVisible();
    await expect(
      page.getByText("Congratulations!", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`dental.bio/${registrationUsername}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("is available, make it yours:", { exact: true }),
    ).toBeVisible();

    const calendarTrigger = page.getByRole("button", {
      name: "Open date of birth calendar",
    });
    await calendarTrigger.click();
    const calendarDialog = page.getByRole("dialog", {
      name: "Choose date of birth",
    });
    await expect(calendarDialog).toBeVisible();
    const latestAvailableBirthday = calendarDialog
      .locator("td:not([data-disabled]) button")
      .last();
    await latestAvailableBirthday.click();
    await expect(calendarDialog).toBeHidden();
    await expect(calendarTrigger).toBeFocused();
    await expect(
      page.getByRole("textbox", { name: "Date of birth" }),
    ).toHaveValue(/^\d{2}\/\d{2}\/\d{4}$/);

    await page.getByRole("button", { name: "Send verification code" }).click();
    await expect(page.getByLabel("Email")).toBeFocused();
    await expect(page.getByText("Email is required")).toBeVisible();

    await page.getByLabel("Email").fill(registrationEmail);
    await page.getByLabel("First name").fill("Registration");
    await page.getByLabel("Last name").fill("Test");
    await page.getByLabel("Position").click();
    await page.getByRole("option", { name: "Dentist", exact: true }).click();
    await page.getByLabel("Country").click();
    await page.getByRole("option", { name: "Egypt", exact: true }).click();
    await page.getByLabel("Password", { exact: true }).fill(originalPassword);
    await page.getByLabel("Confirm password").fill(originalPassword);

    const requestedAfter = new Date(Date.now() - 1_000);
    await page.getByRole("button", { name: "Send verification code" }).click();
    await expect(
      page.getByRole("heading", { name: "Verify your email" }),
    ).toBeVisible();
    const firstCode = await waitForMailpitCode(registrationEmail, {
      after: requestedAfter,
    });
    await page.clock.runFor(61_000);
    await page.waitForTimeout(1_100);
    await page.getByRole("button", { name: "Resend code" }).click();
    const replacementCode = await waitForMailpitCode(registrationEmail, {
      excludeCode: firstCode,
    });

    await page.getByLabel("Verification code").fill(firstCode);
    await page
      .getByRole("button", { name: "Verify and create account" })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Invalid or expired OTP" }),
    ).toBeVisible();

    await page.getByLabel("Verification code").fill(replacementCode);
    await expect(page.getByLabel("Verification code")).toHaveValue(
      replacementCode,
    );
    await page
      .getByRole("button", { name: "Verify and create account" })
      .click();
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);

    await expect
      .poll(async () => {
        const { data } = await admin
          .from("users")
          .select(
            "id, role, registered_domain, subscription_status, customer_id, subscription_id, plan_id",
          )
          .eq("email", registrationEmail)
          .maybeSingle();
        return Boolean(data);
      })
      .toBe(true);

    const { data: profile } = await admin
      .from("users")
      .select(
        "id, role, registered_domain, subscription_status, customer_id, subscription_id, plan_id",
      )
      .eq("email", registrationEmail)
      .single();
    if (!profile) throw new Error("Registration profile was not persisted");
    expect(profile).toMatchObject({
      role: "user",
      registered_domain: "dental.bio",
      subscription_status: "FREE",
      customer_id: null,
      subscription_id: null,
      plan_id: null,
    });
    const { data: completion } = await admin
      .from("registration_completions")
      .select("completed_at")
      .eq("user_id", profile.id)
      .single();
    expect(completion?.completed_at).toBeTruthy();
  } finally {
    const { data } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const createdUser = data.users.find(
      ({ email: candidate }) => candidate === registrationEmail,
    );
    if (createdUser) {
      await admin.from("users").delete().eq("id", createdUser.id);
      await admin.auth.admin.deleteUser(createdUser.id);
    }
  }
});
