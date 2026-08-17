import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const showcases = [
  {
    name: "Basic",
    route: "/template-basic",
    module: "basic-reviews",
    title: "More reviews from our patients",
  },
  {
    name: "Direct Booking",
    route: "/template-direct-booking",
    module: "direct-booking-reviews",
    title: "More reviews before you book",
  },
  {
    name: "Location or Provider Router",
    route: "/template-location-router",
    module: "location-provider-router-reviews",
    title: "More reviews from every location",
  },
  {
    name: "Services Catalogue",
    route: "/template-services-catalogue",
    module: "services-catalogue-reviews",
    title: "More reviews of our services",
  },
  {
    name: "Cosmetic Transformation",
    route: "/template-cosmetic-results",
    module: "cosmetic-transformation-reviews",
    title: "More smile transformation reviews",
  },
  {
    name: "Trust-First Family Practice",
    route: "/template-trust-first",
    module: "trust-first-family-practice-reviews",
    title: "More family dentistry reviews",
  },
  {
    name: "Specialist Assessment",
    route: "/template-specialist-assessment",
    module: "specialist-assessment-reviews",
    title: "More specialist care reviews",
  },
  {
    name: "Clinic and Commerce",
    route: "/template-clinic-commerce",
    module: "clinic-commerce-reviews",
    title: "More reviews of our clinic",
  },
  {
    name: "Expert and Educator",
    route: "/template-expert-educator",
    module: "expert-educator-reviews",
    title: "More educational and clinical reviews",
  },
] as const;

for (const showcase of showcases) {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`${showcase.name} exposes its exact owner external-review heading on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(showcase.route);

      const reviewModule = page.locator(
        `[data-profile-module="${showcase.module}"]`,
      );
      await expect(reviewModule).toBeVisible();
      const heading = reviewModule.getByRole("heading", {
        level: 2,
        name: showcase.title,
        exact: true,
      });
      await expect(heading).toBeVisible();
      const navigation = reviewModule.getByRole("navigation", {
        name: showcase.title,
        exact: true,
      });
      await expect(navigation).toBeVisible();
      await expect(navigation).toHaveAttribute(
        "aria-labelledby",
        (await heading.getAttribute("id")) ?? "",
      );
      await expect(
        reviewModule.getByRole("navigation", {
          name: "External review pages",
        }),
      ).toHaveCount(0);
      await expect(
        navigation.locator("[data-external-review-page-id]").first(),
      ).toBeVisible();

      const scan = await new AxeBuilder({ page })
        .include(`[data-profile-module="${showcase.module}"]`)
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);

      await page.reload();
      await expect(
        page
          .locator(`[data-profile-module="${showcase.module}"]`)
          .getByRole("heading", {
            level: 2,
            name: showcase.title,
            exact: true,
          }),
      ).toBeVisible();
    });
  }
}
