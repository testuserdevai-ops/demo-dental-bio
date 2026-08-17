import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";

const showcases = [
  {
    username: "template-direct-booking",
    templateId: "direct-booking",
    treatmentTitle: "Treatments chosen for you",
    serviceTitle: "Appointment services",
    treatmentIds: [
      "db010000-0000-4000-8000-000000000007",
      "db010000-0000-4000-8000-000000000006",
      "db010000-0000-4000-8000-000000000008",
      "8648cd71-0736-42e5-8af7-3ec780d7c163",
      "ff93ae84-c953-469e-8261-69b7fa69e1ed",
      "abc50f71-b074-4845-848b-50495f4c8799",
    ],
    serviceIds: [
      "da6f2415-7954-4025-872a-0bd94dce8688",
      "bab62dba-28b3-487c-8bb0-338f8506ea58",
    ],
  },
  {
    username: "template-clinic-commerce",
    templateId: "clinic-commerce",
    treatmentTitle: "Clinical treatments",
    serviceTitle: "Clinic services",
    treatmentIds: [
      "c11c0000-0000-4000-8000-000000000007",
      "7ef7cbb1-5487-4164-80b2-c860a4122b60",
      "48bf1766-4996-4b73-8eff-c2a86bf3c50b",
      "592a56be-4229-44e1-8d2d-a9005310118e",
    ],
    serviceIds: [
      "c11c0000-0000-4000-8000-000000000006",
      "c11c0000-0000-4000-8000-000000000008",
      "d1f92332-84dc-42d6-8efc-e3ebe543e8f5",
      "894f4828-0f03-432b-8b08-679402d2084a",
    ],
  },
  {
    username: "template-cosmetic-results",
    templateId: "cosmetic-transformation",
    treatmentTitle: "Smile treatments",
    serviceTitle: "Planning services",
    treatmentIds: [
      "c051e71c-0000-4000-8000-000000000007",
      "c051e71c-0000-4000-8000-000000000006",
      "c051e71c-0000-4000-8000-000000000008",
      "50101f61-5eaa-4a31-8d59-8af54023b620",
      "8173d762-8ec2-4fb8-868e-a460955e07be",
      "e24ddec3-2b17-4ebc-8642-bfeb91e5d668",
    ],
    serviceIds: [
      "96786744-278b-47d6-8861-527dce8eeeef",
      "26b8b48c-dc6e-40a7-8d76-59a7aff21940",
    ],
  },
  {
    username: "template-trust-first",
    templateId: "trust-first-family-practice",
    treatmentTitle: "Family treatments",
    serviceTitle: "Family services",
    treatmentIds: [
      "7f570000-0000-4000-8000-000000000006",
      "7f570000-0000-4000-8000-000000000007",
      "7f570000-0000-4000-8000-000000000008",
      "80f7b165-73f9-4752-87d0-ec595baafbd9",
      "b40f4baf-2362-4cec-81eb-a968e93b8eb2",
      "a33ca4e4-2e76-4187-8bd4-159d1ed4e732",
    ],
    serviceIds: [
      "c4f048f1-e2df-47d5-8dab-1722c6a360ed",
      "112dc1df-3510-41a2-8294-d80b011a4e9f",
    ],
  },
  {
    username: "template-specialist-assessment",
    templateId: "specialist-assessment",
    treatmentTitle: "Specialist treatments chosen by the owner",
    serviceTitle: "Assessment services",
    treatmentIds: [
      "5a5e5500-0000-4000-8000-000000000201",
      "5a5e5500-0000-4000-8000-000000000202",
      "5a5e5500-0000-4000-8000-000000000203",
      "c3b42dc4-3d42-4041-868d-8076b149c218",
      "d30e6a59-5893-471b-8cd0-d0a05bb3c6d4",
      "c9e64b2f-e4a0-4499-87d1-2c3c273aa95b",
    ],
    serviceIds: [
      "62e5ff1d-8f17-4e0d-81e2-2c07a79b7e92",
      "680d42d8-1040-4793-8903-1d469917994a",
    ],
  },
  {
    username: "template-location-router",
    templateId: "location-provider-router",
    treatmentTitle: "Available treatments",
    serviceTitle: "Available services",
    treatmentIds: [
      "8f23e61b-ffa8-4e65-8f7f-108d0f80811d",
      "6e37c61a-1812-49b7-8feb-685fe7a3fabd",
      "8ebba5e8-5e80-465e-8022-7e6c6dada6e4",
      "173acee4-07b1-4f1f-82a6-e3b6377994ba",
    ],
    serviceIds: [
      "d3c17788-aec5-45c0-8499-0cce3814c728",
      "72438a17-42d8-48e3-8ffa-df8b16547ba8",
    ],
  },
  {
    username: "template-expert-educator",
    templateId: "expert-educator",
    treatmentTitle: "Clinical treatments",
    serviceTitle: "Education and consultation services",
    treatmentIds: [
      "ed0ca700-0000-4000-8000-000000000006",
      "ed0ca700-0000-4000-8000-000000000007",
      "ed0ca700-0000-4000-8000-000000000008",
      "7278c4e4-6747-47fd-8237-2096722ebee3",
      "14915a12-9915-4a47-8736-7062dd88408c",
      "4fa0fd77-ec4f-417f-886f-f30524b1fca5",
    ],
    serviceIds: [
      "6a65b178-fd21-4d8c-8882-bc41cd9187a4",
      "412f8082-07cc-493b-8bc4-411be9972bfd",
    ],
  },
  {
    username: "template-services-catalogue",
    templateId: "services-catalogue",
    treatmentTitle: "Treatments explained clearly",
    serviceTitle: "Appointment services",
    treatmentIds: [
      "5e010000-0000-4000-8000-000000000006",
      "5e010000-0000-4000-8000-000000000007",
      "5e010000-0000-4000-8000-000000000008",
      "7c1b749a-9782-4dae-88ba-3145b1cdba4e",
      "c48e8345-220e-4e56-8b2b-a556d04af7d4",
      "aa1a3dd7-6a3d-4883-85c0-2e5a894346e0",
    ],
    serviceIds: [
      "5e010000-0000-4000-8000-000000000009",
      "5e010000-0000-4000-8000-00000000000a",
      "5e010000-0000-4000-8000-00000000000b",
      "75dbd5f1-3850-4d8b-851c-2642a8784006",
      "932584bb-f5f9-492e-8c59-baa5a9c1ffc4",
    ],
  },
] as const;

const attributes = (locator: Locator, name: string) =>
  locator.evaluateAll(
    (nodes, attribute) => nodes.map((node) => node.getAttribute(attribute)),
    name,
  );

for (const showcase of showcases) {
  test(`${showcase.templateId} renders exact separate owner inventories`, async ({
    page,
  }) => {
    await page.goto(`/${showcase.username}`);
    const inventoryModule = page.locator(
      `[data-profile-module="${showcase.templateId}-treatment-services"]`,
    );
    await expect(
      inventoryModule.getByRole("heading", {
        name: showcase.treatmentTitle,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      inventoryModule.getByRole("heading", {
        name: showcase.serviceTitle,
        exact: true,
      }),
    ).toBeVisible();
    const treatmentCards = inventoryModule.locator(
      '[data-profile-inventory-kind="treatment"] [data-treatment-id]',
    );
    const serviceCards = inventoryModule.locator(
      '[data-profile-inventory-kind="service"] [data-treatment-id]',
    );

    const assertExactInventory = async () => {
      expect(await attributes(treatmentCards, "data-treatment-id")).toEqual(
        showcase.treatmentIds,
      );
      expect(await attributes(serviceCards, "data-treatment-id")).toEqual(
        showcase.serviceIds,
      );
      expect(
        await attributes(treatmentCards, "data-inventory-position"),
      ).toEqual(showcase.treatmentIds.map((_, index) => String(index + 1)));
      expect(await attributes(serviceCards, "data-inventory-position")).toEqual(
        showcase.serviceIds.map((_, index) => String(index + 1)),
      );
      expect(
        new Set([...showcase.treatmentIds, ...showcase.serviceIds]).size,
      ).toBe(showcase.treatmentIds.length + showcase.serviceIds.length);
    };

    await assertExactInventory();
    await expect(inventoryModule).not.toContainText(
      /Featured treatments|Featured services|Signature treatment|Featured care|Browse by need/i,
    );
    const scan = await new AxeBuilder({ page })
      .include(
        `[data-profile-module="${showcase.templateId}-treatment-services"]`,
      )
      .analyze();
    expect(scan.violations).toEqual([]);
    await page.reload();
    await assertExactInventory();
  });
}
