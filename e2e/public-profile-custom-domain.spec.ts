import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures/dashboard";
import { createAdminClient } from "./support/test-environment";

test("verified custom domain preserves profile SEO, registered brand, and accessibility", async ({
  page,
  tenant,
}) => {
  const admin = await createAdminClient();
  const customDomain = `${tenant.username}.example.test`;
  const profileTitle = `${tenant.runId} profile`;
  const { error } = await admin
    .from("users")
    .update({
      domain: customDomain,
      domain_verified: true,
      registered_domain: "coach.bio",
    })
    .eq("id", tenant.userId);
  if (error) throw error;

  try {
    await page.setExtraHTTPHeaders({ "x-forwarded-host": customDomain });
    await page.goto("/");

    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle(profileTitle);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://coach.bio/${tenant.username}`,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      profileTitle,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `https://coach.bio/${tenant.username}`,
    );
    await expect(
      page.locator('link[rel="icon"][href="/favicons/coachbio.svg"]'),
    ).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: profileTitle }),
    ).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  } finally {
    await admin
      .from("users")
      .update({
        domain: null,
        domain_verified: false,
        registered_domain: "dental.bio",
      })
      .eq("id", tenant.userId);
  }
});
