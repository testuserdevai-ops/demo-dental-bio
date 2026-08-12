import { expect, test } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 812 },
]) {
  test(`keeps campaign tools and conversion reporting usable at ${viewport.width}px`, async ({
    dashboardPage: page,
    tenant,
  }) => {
    const admin = await createAdminClient();
    const { data: dentistry, error: dentistryError } = await admin
      .from("dentistries")
      .select("dentistry_id")
      .eq("user_id", tenant.userId)
      .single();
    if (dentistryError) throw dentistryError;
    const groupId = crypto.randomUUID();
    const linkId = crypto.randomUUID();
    const { error: groupError } = await admin.from("link_groups").insert({
      link_group_id: groupId,
      dentistry_id: dentistry.dentistry_id,
      heading: "Booking",
      rank: 1,
    });
    if (groupError) throw groupError;
    const { error: linkError } = await admin.from("links").insert({
      link_id: linkId,
      title: "Book online",
      link: "https://booking.example/path?location=hove#book",
      rank: 1,
      is_active: true,
    });
    if (linkError) throw linkError;
    const { error: joinError } = await admin
      .from("dentistry_links")
      .insert({ link_group_id: groupId, link_id: linkId });
    if (joinError) throw joinError;
    const occurredAt = new Date().toISOString();
    const { error: eventError } = await admin
      .from("public_analytics_events")
      .insert({
        event_id: crypto.randomUUID(),
        schema_version: 1,
        profile_id: tenant.userId,
        occurred_at: occurredAt,
        event_date: occurredAt.slice(0, 10),
        action_type: "profile_view",
        section: "profile",
        consent_state: "not_required",
        device_class: "mobile",
      });
    if (eventError) throw eventError;
    await page.setViewportSize(viewport);

    await page.goto("/dashboard/links");
    await expect(page.getByRole("heading", { name: "Links" })).toBeVisible();
    const edit = page.getByRole("button", { name: /^Edit / }).first();
    await edit.click();
    const form = page.locator("form").filter({
      has: page.getByRole("button", { name: "Update link" }),
    });
    await form.getByLabel("Add campaign tracking").click();
    await form.getByRole("button", { name: "Instagram" }).click();
    await form.getByLabel("Campaign").fill("mobile-booking");
    const preview = form.getByTestId("campaign-url-preview");
    await expect(preview).toContainText("utm_source=instagram");
    await expect(preview).toContainText("utm_medium=paid_social");
    await expect(preview).toContainText("utm_campaign=mobile-booking");
    await expect(
      form.getByRole("button", { name: "Copy campaign link" }),
    ).toBeVisible();
    await expect(form.getByRole("link", { name: "Test link" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await page.goto("/dashboard/analytics?tab=conversions&range=7d");
    await expect(
      page.getByRole("heading", { name: "Analytics" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Manage goals" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await page.getByRole("link", { name: "Manage goals" }).click();
    await expect(
      page.getByRole("heading", { name: "Conversion goals" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your goals" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Add an item goal" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
