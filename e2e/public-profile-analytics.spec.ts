import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures/dashboard";
import { createAdminClient } from "./support/test-environment";

test("public actions preserve native links and preview traffic stays isolated", async ({
  dashboardPage: page,
  tenant,
}) => {
  const admin = await createAdminClient();
  const { data: dentistry, error: dentistryError } = await admin
    .from("dentistries")
    .select("dentistry_id")
    .eq("user_id", tenant.userId)
    .single();
  if (dentistryError || !dentistry) throw dentistryError;

  const { data: group, error: groupError } = await admin
    .from("link_groups")
    .insert({
      dentistry_id: dentistry.dentistry_id,
      heading: `${tenant.runId} resources`,
      rank: 1,
    })
    .select("link_group_id")
    .single();
  if (groupError || !group) throw groupError;

  const linkTitle = `${tenant.runId} public action`;
  const { data: link, error: linkError } = await admin
    .from("links")
    .insert({
      title: linkTitle,
      link: "https://example.invalid/profile-action",
      is_active: true,
      rank: 1,
    })
    .select("link_id")
    .single();
  if (linkError || !link) throw linkError;

  const { error: joinError } = await admin.from("dentistry_links").insert({
    link_group_id: group.link_group_id,
    link_id: link.link_id,
  });
  if (joinError) throw joinError;

  let analyticsRequests = 0;
  let legacyCounterRequests = 0;
  await page.route("**/api/analytics/**", async (route) => {
    analyticsRequests += 1;
    await route.fulfill({ status: 204 });
  });
  await page.route("**/api/links/click", async (route) => {
    legacyCounterRequests += 1;
    await route.fulfill({ status: 200, json: { click_counter: 1 } });
  });

  try {
    await page.goto(`/${tenant.username}`);
    const publicLink = page.getByRole("link", { name: linkTitle });
    await expect(publicLink).toHaveAttribute(
      "href",
      "https://example.invalid/profile-action",
    );
    await expect(publicLink).toHaveAttribute("target", "_blank");
    await expect(publicLink).toHaveAttribute("rel", "noopener noreferrer");

    await publicLink.evaluate((element) =>
      element.addEventListener("click", (event) => event.preventDefault()),
    );
    await publicLink.focus();
    await expect(publicLink).toBeFocused();
    await publicLink.press("Enter");
    await expect.poll(() => legacyCounterRequests).toBe(1);
    expect(analyticsRequests).toBe(0);

    const { violations } = await new AxeBuilder({ page })
      .include("#links")
      .analyze();
    expect(violations).toEqual([]);

    legacyCounterRequests = 0;
    await page.goto(`/${tenant.username}?analyticsContext=preview`);
    const previewLink = page.getByRole("link", { name: linkTitle });
    await previewLink.evaluate((element) =>
      element.addEventListener("click", (event) => event.preventDefault()),
    );
    await previewLink.click();
    await page.waitForTimeout(100);

    expect(legacyCounterRequests).toBe(0);
    expect(analyticsRequests).toBe(0);
  } finally {
    await admin
      .from("link_groups")
      .delete()
      .eq("link_group_id", group.link_group_id);
    await admin.from("links").delete().eq("link_id", link.link_id);
  }
});
