import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/dashboard";
import { createAdminClient } from "./support/test-environment";

const templateSteps = {
  basic: [
    "profile-details",
    "social-links",
    "links",
    "treatments",
    "videos",
    "gallery",
    "locations",
  ],
  "direct-booking": [
    "profile-details",
    "social-links",
    "treatments",
    "locations",
    "links",
  ],
  "location-provider-router": [
    "profile-details",
    "social-links",
    "locations",
    "treatments",
    "links",
  ],
  "services-catalogue": [
    "profile-details",
    "social-links",
    "treatments",
    "links",
    "locations",
  ],
  "cosmetic-transformation": [
    "profile-details",
    "social-links",
    "treatments",
    "gallery",
    "reviews",
    "locations",
  ],
  "trust-first-family-practice": [
    "profile-details",
    "social-links",
    "reviews",
    "links",
    "treatments",
    "locations",
  ],
  "specialist-assessment": [
    "profile-details",
    "social-links",
    "links",
    "treatments",
    "locations",
  ],
  "expert-educator": [
    "profile-details",
    "social-links",
    "links",
    "videos",
    "locations",
  ],
  "clinic-commerce": [
    "profile-details",
    "social-links",
    "treatments",
    "products",
    "locations",
  ],
} as const;

type TemplateId = keyof typeof templateSteps;

const stepTitles: Record<string, string> = {
  "profile-details": "Add your profile and booking details",
  "social-links": "Add social profiles",
  links: "Add useful links",
  treatments: "Add treatments or services",
  videos: "Add a video",
  gallery: "Add gallery content",
  locations: "Add your practice locations",
  reviews: "Add patient reviews",
  products: "Add products or paid resources",
};

async function selectTemplate(userId: string, templateId: TemplateId) {
  const admin = await createAdminClient();
  const { data: owner, error: readError } = await admin
    .from("users")
    .select("profile_presentation_draft_revision")
    .eq("id", userId)
    .single();
  expect(readError).toBeNull();
  const revision = (owner?.profile_presentation_draft_revision ?? 0) + 1;
  const { error } = await admin
    .from("users")
    .update({
      profile_presentation_draft: {
        schemaVersion: 1,
        templateId,
        themeId: "clinical-light",
        layoutVariant: "classic-stack",
        answers: {},
      },
      profile_presentation_draft_revision: revision,
      profile_presentation_draft_updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  expect(error).toBeNull();
  const { error: progressError } = await admin
    .from("profile_onboarding_progress")
    .delete()
    .eq("user_id", userId);
  expect(progressError).toBeNull();
}

async function makeOwnerContentBlank(userId: string) {
  const admin = await createAdminClient();
  const { error } = await admin
    .from("dentistries")
    .update({
      about_title: "",
      about_text: "",
      phone: "",
      contact_email: "",
      website: "",
      booking_link: "",
      booking_link_enabled: false,
    })
    .eq("user_id", userId);
  expect(error).toBeNull();
}

async function expectUnoccludedMobileStep(page: Page) {
  const actionBar = page.locator("[data-onboarding-action-bar]");
  const skip = page.getByRole("button", { name: "Skip", exact: true });
  const form = page.locator("main form").first();

  await expect(actionBar).toHaveCSS("position", "fixed");
  await expect(skip).toBeInViewport();
  await expect(skip).toBeEnabled();
  await skip.click({ trial: true });
  await expect(form).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open the full editor" }),
  ).toBeVisible();

  const geometry = await page.evaluate(() => {
    const bar = document
      .querySelector("[data-onboarding-action-bar]")!
      .getBoundingClientRect();
    const skipButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Skip",
    )!;
    const skip = skipButton.getBoundingClientRect();
    return {
      barBottom: bar.bottom,
      barTop: bar.top,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      skipHeight: skip.height,
      viewportHeight: window.innerHeight,
    };
  });

  expect(geometry.scrollWidth).toBe(geometry.clientWidth);
  expect(geometry.barTop).toBeGreaterThan(0);
  expect(geometry.barBottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.skipHeight).toBeGreaterThanOrEqual(44);
}

async function walkEveryTemplate(
  page: Page,
  userId: string,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  for (const [templateId, steps] of Object.entries(templateSteps) as [
    TemplateId,
    readonly string[],
  ][]) {
    await selectTemplate(userId, templateId);
    await page.goto(`/onboarding/questions?template=${templateId}`);

    for (const [index, step] of steps.entries()) {
      await expect(page).toHaveURL(
        new RegExp(
          `/onboarding/questions\\?template=${templateId}(?:&step=${step})?$`,
        ),
      );
      await expect(
        page.getByRole("heading", { name: stepTitles[step], exact: false }),
      ).toBeVisible();
      await expectUnoccludedMobileStep(page);

      if (templateId === "basic" && index === 1) {
        await page.getByRole("link", { name: "Finish later" }).click();
        await expect(page).toHaveURL(/\/dashboard$/);
        const widget = page.getByTestId("profile-setup-widget");
        await expect(widget).toContainText(
          `1 of ${steps.length} setup steps completed`,
        );
        await widget.getByRole("link", { name: "Continue setup" }).click();
        await expect(page).toHaveURL(
          new RegExp(`template=basic&step=${step}$`),
        );
        await expectUnoccludedMobileStep(page);
      }

      await page.getByRole("button", { name: "Skip", exact: true }).click();
    }

    await expect(page).toHaveURL(
      new RegExp(`/onboarding/questions\\?template=${templateId}&step=review$`),
    );
    await expect(
      page.getByRole("heading", { name: "Review your profile plan" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue to dashboard" }),
    ).toBeInViewport();

    if (templateId === "basic") {
      await page.getByRole("link", { name: "Continue to dashboard" }).click();
      const widget = page.getByTestId("profile-setup-widget");
      await expect(widget).toContainText("Setup complete");
      await expect(widget.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "100",
      );
    }
  }
}

async function installMapsStub(page: Page) {
  await page.addInitScript(() => {
    const location = { lat: () => 51.5072, lng: () => -0.1276 };
    class Geocoder {
      geocode(
        _request: unknown,
        callback: (results: unknown[], status: string) => void,
      ) {
        callback(
          [
            {
              address_components: [
                { long_name: "London", types: ["locality"] },
                { long_name: "United Kingdom", types: ["country"] },
              ],
              geometry: { location },
            },
          ],
          "OK",
        );
      }
    }
    class Map {
      setCenter() {}
      setZoom() {}
    }
    class Marker {
      setPosition() {}
    }
    class Autocomplete {
      addListener() {}
      getPlace() {
        return {};
      }
    }
    (window as unknown as Record<string, unknown>).google = {
      maps: {
        Geocoder,
        Map,
        Marker,
        event: { clearListeners() {} },
        places: { Autocomplete },
      },
    };
  });
}

async function openBuilderStep(
  page: Page,
  userId: string,
  templateId: TemplateId,
  step: string,
) {
  await selectTemplate(userId, templateId);
  await page.goto(`/onboarding/questions?template=${templateId}&step=${step}`);
  await expect(page).toHaveURL(
    new RegExp(`template=${templateId}&step=${step}$`),
  );
  await expectUnoccludedMobileStep(page);
}

test.describe.serial("blank owner template onboarding", () => {
  test.beforeEach(async ({ dashboardPage: page }) => {
    await installMapsStub(page);
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 375, height: 812 },
  ]) {
    test(`a blank owner can skip and resume all nine walkthroughs at ${viewport.width}x${viewport.height}`, async ({
      dashboardPage: page,
      tenant,
    }) => {
      await makeOwnerContentBlank(tenant.userId);
      await walkEveryTemplate(page, tenant.userId, viewport);
    });
  }

  test("creates each supported content kind without leaving mobile onboarding", async ({
    dashboardPage: page,
    tenant,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await openBuilderStep(page, tenant.userId, "basic", "profile-details");
    await page.getByLabel("Profile title").fill("A real owner-written profile");
    await page.getByLabel("Bio").fill("Owner-written care information.");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Saved.", { exact: false })).toBeVisible();

    await openBuilderStep(page, tenant.userId, "basic", "treatments");
    await page.getByLabel("Treatment title").fill("New patient consultation");
    await page
      .getByLabel("Treatment description")
      .fill("A focused first appointment.");
    await page.getByRole("button", { name: "Add treatment" }).click();
    await expect(page.getByText("Saved.", { exact: false })).toBeVisible();

    await openBuilderStep(page, tenant.userId, "basic", "locations");
    await page.getByLabel("Business Name").fill("Owner Dental Practice");
    await page.getByLabel("Enter your address").fill("1 Test Street, London");
    await expect(page.getByLabel("City")).toHaveValue("London");
    await page.getByRole("button", { name: "Add location" }).click();
    await expect(page.getByText("Saved.", { exact: false })).toBeVisible();

    await openBuilderStep(page, tenant.userId, "basic", "links");
    await page.getByLabel("New group heading").fill("Patient resources");
    await page.getByRole("button", { name: "Add group" }).click();
    await expect(page.getByLabel("New link title")).toBeVisible();
    await page.getByLabel("New link title").fill("Preparing for your visit");
    await page.getByLabel("URL").fill("https://example.test/prepare");
    await page.getByRole("button", { name: "Add link" }).click();
    await expect(page.getByText("Saved.", { exact: false })).toBeVisible();

    await openBuilderStep(page, tenant.userId, "basic", "videos");
    await page.getByLabel("Group name").fill("Owner videos");
    await page.getByRole("button", { name: "Add group" }).click();
    await expect(page.getByLabel("Video title")).toBeVisible();
    await page.getByLabel("Video title").fill("What to expect");
    await page
      .getByLabel("Video URL")
      .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Add video" }).click();
    await expect(page.getByText("Saved.", { exact: false })).toBeVisible();

    const image = {
      name: "owner-content.webp",
      mimeType: "image/webp",
      buffer: Buffer.from("owner-content-image"),
    };
    await openBuilderStep(page, tenant.userId, "basic", "gallery");
    await page.getByLabel("Gallery title").fill("Owner smile example");
    await page.getByLabel("Before image", { exact: true }).setInputFiles(image);
    await page.getByLabel("After image", { exact: true }).setInputFiles(image);
    await page.getByRole("button", { name: "Save gallery" }).click();
    await expect(page.getByText("Saved.", { exact: false })).toBeVisible();

    await openBuilderStep(
      page,
      tenant.userId,
      "cosmetic-transformation",
      "reviews",
    );
    await page.getByLabel("Reviewer name").fill("Consenting patient");
    await page.getByLabel("Review content").fill("A clear and kind visit.");
    await page.getByLabel("Review platform").fill("Written consent");
    await page.getByRole("button", { name: "Save review" }).click();
    await expect(page.getByText("Saved.", { exact: false })).toBeVisible();

    await openBuilderStep(page, tenant.userId, "clinic-commerce", "products");
    await page.getByLabel("Product name").fill("Owner care guide");
    await page.getByLabel("Price").fill("12.50");
    await page.getByLabel("Platform").fill("Owner store");
    await page.getByLabel("Product URL").fill("https://example.test/guide");
    await page.getByLabel("Product image").setInputFiles(image);
    await page.getByRole("button", { name: "Add product" }).click();
    await expect(page.getByText("Saved.", { exact: false })).toBeVisible();

    const admin = await createAdminClient();
    const { data: dentistry, error: dentistryError } = await admin
      .from("dentistries")
      .select("dentistry_id,about_title,about_text")
      .eq("user_id", tenant.userId)
      .single();
    expect(dentistryError).toBeNull();
    expect(dentistry).toMatchObject({
      about_title: "A real owner-written profile",
      about_text: "Owner-written care information.",
    });

    const ownedCounts = await Promise.all([
      admin
        .from("dentistry_treatments")
        .select("*", { count: "exact", head: true })
        .eq("dentistry_id", dentistry!.dentistry_id),
      admin
        .from("dentistry_locations")
        .select("*", { count: "exact", head: true })
        .eq("dentistry_id", dentistry!.dentistry_id),
      admin
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", tenant.userId),
      admin
        .from("galleries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", tenant.userId),
      admin
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", tenant.userId),
    ]);
    for (const result of ownedCounts) expect(result.error).toBeNull();
    expect(ownedCounts.map(({ count }) => count)).toEqual([1, 1, 1, 1, 1]);

    const { data: linkGroups, error: linkGroupError } = await admin
      .from("link_groups")
      .select("link_group_id")
      .eq("dentistry_id", dentistry!.dentistry_id);
    expect(linkGroupError).toBeNull();
    expect(linkGroups).toHaveLength(1);
    const { count: linkCount, error: linkError } = await admin
      .from("dentistry_links")
      .select("*", { count: "exact", head: true })
      .eq("link_group_id", linkGroups![0].link_group_id);
    expect(linkError).toBeNull();
    expect(linkCount).toBe(1);

    const { data: videoGroups, error: videoGroupError } = await admin
      .from("groups")
      .select("id")
      .eq("user_id", tenant.userId);
    expect(videoGroupError).toBeNull();
    expect(videoGroups).toHaveLength(1);
    const { count: videoCount, error: videoError } = await admin
      .from("videos")
      .select("*", { count: "exact", head: true })
      .eq("group_id", videoGroups![0].id);
    expect(videoError).toBeNull();
    expect(videoCount).toBe(1);
  });
});
