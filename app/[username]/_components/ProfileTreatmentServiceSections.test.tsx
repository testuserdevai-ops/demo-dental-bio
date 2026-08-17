import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { ProfileTreatmentServiceSelection } from "../_lib/profile-treatment-services";
import ProfileTreatmentServiceSections, {
  type ProfileInventoryVariant,
} from "./ProfileTreatmentServiceSections";

const inventory: ProfileTreatmentServiceSelection = {
  treatments: Array.from({ length: 6 }, (_, index) => ({
    id: `t-${index + 1}`,
    title: `Owner treatment ${index + 1}`,
    description: `Complete treatment detail ${index + 1}`,
    rank: index + 1,
    position: index + 1,
    kind: "treatment" as const,
  })),
  services: Array.from({ length: 4 }, (_, index) => ({
    id: `s-${index + 1}`,
    title: `Owner service ${index + 1}`,
    description: `Complete service detail ${index + 1}`,
    rank: index + 1,
    position: index + 1,
    kind: "service" as const,
  })),
};

function renderSections(variant: ProfileInventoryVariant, value = inventory) {
  return renderToStaticMarkup(
    <ProfileTreatmentServiceSections
      inventory={value}
      moduleId={`test-${variant}`}
      serviceTitle="Owner service heading"
      treatmentTitle="Owner treatment heading"
      variant={variant}
    />,
  );
}

describe("ProfileTreatmentServiceSections", () => {
  for (const variant of [
    "numbered",
    "card-grid",
    "accent-grid",
    "compact-grid",
    "editorial-grid",
  ] as const) {
    test(`renders the complete adjacent owner inventories with the ${variant} variant`, () => {
      const markup = renderSections(variant);
      expect(markup.match(/Owner treatment heading/g)).toHaveLength(1);
      expect(markup.match(/Owner service heading/g)).toHaveLength(1);
      expect(markup.match(/data-treatment-id="t-/g)).toHaveLength(6);
      expect(markup.match(/data-treatment-id="s-/g)).toHaveLength(4);
      expect(markup.indexOf('id="treatments"')).toBeLessThan(
        markup.indexOf('id="services"'),
      );
      expect(markup).toContain("Complete treatment detail 6");
      expect(markup).toContain("Complete service detail 4");
      expect(markup).not.toMatch(/Featured|Signature|Support/i);
    });
  }

  test("hides each empty kind independently and collapses an empty inventory", () => {
    const treatmentOnly = renderSections("card-grid", {
      treatments: inventory.treatments,
      services: [],
    });
    expect(treatmentOnly).toContain('id="treatments"');
    expect(treatmentOnly).not.toContain('id="services"');

    const serviceOnly = renderSections("card-grid", {
      treatments: [],
      services: inventory.services,
    });
    expect(serviceOnly).not.toContain('id="treatments"');
    expect(serviceOnly).toContain('id="services"');
    expect(renderSections("card-grid", { treatments: [], services: [] })).toBe(
      "",
    );
  });
});
