import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const showcases = [
  [
    "template-direct-booking",
    "direct-booking",
    "Treatments chosen for you",
    "Appointment services",
    6,
    2,
  ],
  [
    "template-clinic-commerce",
    "clinic-commerce",
    "Clinical treatments",
    "Clinic services",
    4,
    4,
  ],
  [
    "template-cosmetic-results",
    "cosmetic-transformation",
    "Smile treatments",
    "Planning services",
    6,
    2,
  ],
  [
    "template-trust-first",
    "trust-first-family-practice",
    "Family treatments",
    "Family services",
    6,
    2,
  ],
  [
    "template-specialist-assessment",
    "specialist-assessment",
    "Specialist treatments chosen by the owner",
    "Assessment services",
    6,
    2,
  ],
  [
    "template-location-router",
    "location-provider-router",
    "Available treatments",
    "Available services",
    3,
    2,
  ],
  [
    "template-expert-educator",
    "expert-educator",
    "Clinical treatments",
    "Education and consultation services",
    6,
    2,
  ],
] as const;

for (const [
  username,
  templateId,
  treatmentTitle,
  serviceTitle,
  treatments,
  services,
] of showcases) {
  test(`${templateId} renders complete separate owner inventories`, async ({
    page,
  }) => {
    await page.goto(`/${username}`);
    const inventoryModule = page.locator(
      `[data-profile-module="${templateId}-treatment-services"]`,
    );
    await expect(
      inventoryModule.getByRole("heading", {
        name: treatmentTitle,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      inventoryModule.getByRole("heading", {
        name: serviceTitle,
        exact: true,
      }),
    ).toBeVisible();
    const treatmentSection = inventoryModule.locator(
      '[data-profile-inventory-kind="treatment"]',
    );
    const serviceSection = inventoryModule.locator(
      '[data-profile-inventory-kind="service"]',
    );
    await expect(treatmentSection.locator("[data-treatment-id]")).toHaveCount(
      treatments,
    );
    await expect(serviceSection.locator("[data-treatment-id]")).toHaveCount(
      services,
    );
    await expect(
      treatmentSection.locator("[data-inventory-position]").first(),
    ).toHaveAttribute("data-inventory-position", "1");
    await expect(
      serviceSection.locator("[data-inventory-position]").first(),
    ).toHaveAttribute("data-inventory-position", "1");
    await expect(inventoryModule).not.toContainText(
      /Featured treatments|Featured services|Signature treatment/i,
    );
    const scan = await new AxeBuilder({ page })
      .include(`[data-profile-module="${templateId}-treatment-services"]`)
      .analyze();
    expect(scan.violations).toEqual([]);
    await page.reload();
    await expect(inventoryModule.locator("[data-treatment-id]")).toHaveCount(
      treatments + services,
    );
  });
}
