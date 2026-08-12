import { test, expect } from "../fixtures/dashboard";
import { createAdminClient } from "../support/test-environment";

test.describe("owner analytics", () => {
  test("reconciles authoritative events and stays usable at narrow mobile widths", async ({
    dashboardPage: page,
    tenant,
  }) => {
    const admin = await createAdminClient();
    const occurredAt = new Date().toISOString();
    const eventDate = occurredAt.slice(0, 10);
    const { count: baselineViews, error: baselineError } = await admin
      .from("public_analytics_events")
      .select("event_id", { count: "exact", head: true })
      .eq("profile_id", tenant.userId)
      .eq("action_type", "profile_view")
      .gte("event_date", eventDate)
      .lte("event_date", eventDate);
    if (baselineError) throw baselineError;
    const visitorA = "a".repeat(64);
    const visitorB = "b".repeat(64);
    const linkId = crypto.randomUUID();
    const events = [
      {
        action_type: "profile_view",
        visitor_hash: visitorA,
        section: "profile",
      },
      {
        action_type: "profile_view",
        visitor_hash: visitorA,
        section: "profile",
      },
      {
        action_type: "profile_view",
        visitor_hash: visitorB,
        section: "profile",
      },
      {
        action_type: "profile_view",
        visitor_hash: visitorA,
        section: "profile",
      },
      {
        action_type: "profile_view",
        visitor_hash: visitorB,
        section: "profile",
      },
      {
        action_type: "link_click",
        visitor_hash: visitorA,
        section: "links",
        entity_uuid: linkId,
        visible_position: 1,
      },
      {
        action_type: "booking_click",
        visitor_hash: visitorB,
        section: "profile",
        visible_position: 1,
      },
    ].map((event, index) => ({
      event_id: crypto.randomUUID(),
      schema_version: 1,
      profile_id: tenant.userId,
      occurred_at: occurredAt,
      event_date: eventDate,
      consent_state: "granted",
      device_class: "mobile",
      request_hash: (index + 1).toString(16).repeat(64),
      ...event,
    }));
    const { error } = await admin
      .from("public_analytics_events")
      .insert(events);
    if (error) throw error;

    for (const width of [390, 375]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto("/dashboard/analytics?tab=overview&range=7d");
      await expect(
        page.getByRole("heading", { name: "Analytics" }),
      ).toBeVisible();
      const metrics = page.getByLabel("Key metrics");
      await expect(metrics.getByText("Views", { exact: true })).toBeVisible();
      await expect(
        metrics
          .getByLabel("Views metric", { exact: true })
          .getByText(String((baselineViews ?? 0) + 5), { exact: true }),
      ).toBeVisible();
      await expect(
        metrics.getByText("Unique visitors", { exact: true }),
      ).toBeVisible();
      await expect(
        metrics.getByText("2", { exact: true }).first(),
      ).toBeVisible();
      await expect(
        metrics.getByText("Profile click rate", { exact: true }),
      ).toBeVisible();
      await expect(metrics.getByText("100%", { exact: true })).toBeVisible();
      await expect(
        metrics.getByText("Conversions", { exact: true }),
      ).toBeVisible();
      await expect(
        metrics
          .getByLabel("Conversions metric", { exact: true })
          .getByText("1", { exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }

    await page.getByRole("link", { name: "Content", exact: true }).click();
    await expect(page).toHaveURL(/tab=content&range=7d/);
    await expect(
      page.getByText(`Link · ${linkId.slice(-6)}`).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "CTR" })).toBeVisible();
    await expect(page.getByText("Visible position 1").first()).toBeVisible();

    await page.getByRole("link", { name: "Audience", exact: true }).click();
    await expect(page).toHaveURL(/tab=audience&range=7d/);
    await expect(page.getByRole("heading", { name: "Devices" })).toBeVisible();
    await expect(
      page.getByText("Mobile", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Geography is unavailable")).toBeVisible();
  });

  test("opens stable link drill-downs and preserves deleted labels on mobile", async ({
    dashboardPage: page,
    tenant,
  }) => {
    const admin = await createAdminClient();
    const { data: dentistry, error: dentistryError } = await admin
      .from("dentistries")
      .select("dentistry_id")
      .eq("user_id", tenant.userId)
      .single();
    if (dentistryError || !dentistry) {
      throw dentistryError ?? new Error("Missing worker dentistry");
    }
    const { data: existingGroups, error: existingGroupsError } = await admin
      .from("link_groups")
      .select("rank")
      .eq("dentistry_id", dentistry.dentistry_id)
      .order("rank", { ascending: false })
      .limit(1);
    if (existingGroupsError) throw existingGroupsError;
    const groupRank = (existingGroups?.[0]?.rank ?? 0) + 1;
    const groupId = crypto.randomUUID();
    const linkId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    const occurredAt = new Date().toISOString();
    const { error: groupError } = await admin.from("link_groups").insert({
      link_group_id: groupId,
      dentistry_id: dentistry.dentistry_id,
      heading: "Appointments",
      rank: groupRank,
    });
    if (groupError) throw groupError;
    const { error: linkError } = await admin.from("links").insert({
      link_id: linkId,
      title: "Book a consultation",
      link: "https://example.test/book",
      rank: 1,
      is_active: true,
    });
    if (linkError) throw linkError;
    const { error: joinError } = await admin.from("dentistry_links").insert({
      link_group_id: groupId,
      link_id: linkId,
    });
    if (joinError) throw joinError;
    const { error: eventError } = await admin
      .from("public_analytics_events")
      .insert({
        event_id: eventId,
        schema_version: 1,
        profile_id: tenant.userId,
        occurred_at: occurredAt,
        event_date: occurredAt.slice(0, 10),
        action_type: "link_click",
        section: "links",
        visible_position: 1,
        entity_uuid: linkId,
        consent_state: "not_required",
        device_class: "mobile",
      });
    if (eventError) throw eventError;

    for (const width of [390, 375]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto("/dashboard/links");
      const entryPoint = page.locator(
        `a[href*="contentAction=link_click"][href*="contentId=${linkId}"]`,
      );
      await expect(entryPoint).toBeVisible();
      expect((await entryPoint.boundingBox())?.height).toBeGreaterThanOrEqual(
        44,
      );
      await entryPoint.click();
      await expect(page).toHaveURL(
        new RegExp(
          `tab=content.*contentAction=link_click.*contentId=${linkId}`,
        ),
      );
      await expect(
        page.getByRole("heading", { name: "Book a consultation" }).first(),
      ).toBeVisible();
      await expect(page.getByText("Clicks").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }

    const timezone = page.getByRole("combobox", {
      name: "Reporting timezone",
    });
    await timezone.selectOption("Africa/Cairo");
    await page.getByRole("button", { name: "Save timezone" }).click();
    await expect(page.getByText("Reporting timezone saved.")).toBeVisible();
    await page.reload();
    await expect(timezone).toHaveValue("Africa/Cairo");

    const { error: joinDeleteError } = await admin
      .from("dentistry_links")
      .delete()
      .eq("link_id", linkId);
    if (joinDeleteError) throw joinDeleteError;
    const { error: linkDeleteError } = await admin
      .from("links")
      .delete()
      .eq("link_id", linkId);
    if (linkDeleteError) throw linkDeleteError;

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Book a consultation" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Deleted · historical activity")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to all content" }),
    ).toBeVisible();
  });
});
