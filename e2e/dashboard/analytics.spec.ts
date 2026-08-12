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
      await expect(metrics.getByText("3", { exact: true })).toBeVisible();
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
      await expect(metrics.getByText("1", { exact: true })).toBeVisible();
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
  });
});
