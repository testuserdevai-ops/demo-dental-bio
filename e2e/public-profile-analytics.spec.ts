import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures/dashboard";
import { createAdminClient } from "./support/test-environment";

test("public actions stay native while production and preview analytics remain disabled", async ({
  page,
  tenant,
}) => {
  test.setTimeout(60_000);
  const admin = await createAdminClient();
  const { data: dentistry, error: dentistryError } = await admin
    .from("dentistries")
    .select("dentistry_id")
    .eq("user_id", tenant.userId)
    .single();
  if (dentistryError || !dentistry) throw dentistryError;

  const { data: existingGroups, error: existingGroupsError } = await admin
    .from("link_groups")
    .select("rank")
    .eq("dentistry_id", dentistry.dentistry_id)
    .order("rank", { ascending: false })
    .limit(1);
  if (existingGroupsError) throw existingGroupsError;
  const nextGroupRank = (existingGroups?.[0]?.rank ?? 0) + 1;

  const { data: group, error: groupError } = await admin
    .from("link_groups")
    .insert({
      dentistry_id: dentistry.dentistry_id,
      heading: `${tenant.runId} resources`,
      rank: nextGroupRank,
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

  // Seed before dashboard login: the dashboard preview intentionally primes
  // the persistent public-profile cache as soon as the shell renders.
  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(tenant.email);
  await page.getByPlaceholder("Enter your password").fill(tenant.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);

  const analyticsActions: string[] = [];
  let legacyCounterRequests = 0;
  await page.route("**/api/analytics/**", async (route) => {
    const payload = route.request().postDataJSON() as {
      action?: { type?: string };
    };
    if (payload.action?.type) analyticsActions.push(payload.action.type);
    await route.fulfill({ status: 204 });
  });
  await page.route("**/api/links/click", async (route) => {
    legacyCounterRequests += 1;
    await route.fulfill({ status: 200, json: { click_counter: 1 } });
  });

  try {
    await page.goto(`/${tenant.username}`);
    await page
      .locator("#onscroll-header")
      .getByRole("button", { name: "Share profile" })
      .click();
    const messengerShare = page.getByRole("link", {
      name: "Share via Messenger",
    });
    await expect(messengerShare).toHaveAttribute(
      "href",
      "https://www.messenger.com/new",
    );
    await expect(messengerShare).toHaveAttribute("target", "_blank");
    await expect(messengerShare).toHaveAttribute("rel", "noopener noreferrer");
    // Axe samples composited colors, so wait for the finite dialog fade to
    // settle instead of scanning its deliberately translucent opening frame.
    await page.waitForTimeout(350);
    const { violations: shareDialogViolations } = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();
    expect(shareDialogViolations).toEqual([]);
    await page.getByRole("button", { name: "Close dialog" }).click();

    const publicLink = page.getByRole("link", { name: linkTitle });
    await expect(publicLink).toHaveAttribute(
      "href",
      "https://example.invalid/profile-action",
    );
    await expect(publicLink).toHaveAttribute("target", "_blank");
    await expect(publicLink).toHaveAttribute("rel", "noopener noreferrer");

    await publicLink.evaluate((element) => {
      element.setAttribute("href", "#links");
      element.removeAttribute("target");
    });
    await publicLink.focus();
    await expect(publicLink).toBeFocused();
    await publicLink.press("Enter");
    await expect.poll(() => legacyCounterRequests).toBe(1);
    expect(analyticsActions).toEqual([]);

    const { violations } = await new AxeBuilder({ page })
      .include("#links")
      .analyze();
    expect(violations).toEqual([]);

    legacyCounterRequests = 0;
    analyticsActions.length = 0;
    await page.goto(`/${tenant.username}?analyticsContext=preview`);
    const previewLink = page.getByRole("link", { name: linkTitle });
    await previewLink.evaluate((element) =>
      element.addEventListener("click", (event) => event.preventDefault()),
    );
    await previewLink.click();
    await page.waitForTimeout(100);

    expect(legacyCounterRequests).toBe(0);
    expect(analyticsActions).toEqual([]);
  } finally {
    await admin
      .from("link_groups")
      .delete()
      .eq("link_group_id", group.link_group_id);
    await admin.from("links").delete().eq("link_id", link.link_id);
  }
});
