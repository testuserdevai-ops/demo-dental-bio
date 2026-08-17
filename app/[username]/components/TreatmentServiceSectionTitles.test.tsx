import React from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import Services from "./Services";
import Treatments from "./Treatments";

const treatmentTitle = "Owner basic treatments";
const serviceTitle = "Owner basic services";
const mixedInventory = [
  {
    treatment_id: "t-1",
    treatments: {
      title: "Dental implants",
      description: "Treatment detail",
      isService: false,
    },
  },
  {
    treatment_id: "s-1",
    treatments: {
      title: "Consultation support",
      description: "Service detail",
      isService: true,
    },
  },
];

function renderSections(inventory: typeof mixedInventory) {
  return render(
    <AnalyticsProvider
      profileId="00000000-0000-4000-8000-000000000001"
      renderContext={{ kind: "excluded", reason: "unverified_preview" }}
    >
      <Treatments sectionTitle={treatmentTitle} serverTreatments={inventory} />
      <Services sectionTitle={serviceTitle} serverTreatments={inventory} />
    </AnalyticsProvider>,
  );
}

afterEach(cleanup);

describe("Basic treatment and service section headings", () => {
  test("uses each exact owner heading once for mixed inventory", () => {
    renderSections(mixedInventory);
    expect(
      screen.getAllByRole("heading", { name: treatmentTitle }),
    ).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: serviceTitle })).toHaveLength(
      1,
    );
  });

  test("renders no owner inventory heading when both inventories are empty", () => {
    renderSections([]);
    expect(screen.queryByRole("heading", { name: treatmentTitle })).toBeNull();
    expect(screen.queryByRole("heading", { name: serviceTitle })).toBeNull();
  });
});
