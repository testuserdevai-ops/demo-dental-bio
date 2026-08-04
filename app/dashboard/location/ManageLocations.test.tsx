import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import { DashboardScopeProvider } from "@/app/contexts/DashboardScopeContext";
import { PreviewProvider } from "@/app/contexts/PreviewContext";

mock.module("./AddLocation", () => ({ default: () => null }));
mock.module("../components/AddressItem", () => ({ default: () => null }));

const { default: ManageLocations } = await import("./ManageLocations");

function renderLocations(canManageSubscription: boolean, proAvailable = false) {
  return render(
    <DashboardScopeProvider
      scope={{
        effectiveUserId: "00000000-0000-4000-8000-000000000001",
        dentistryId: "00000000-0000-4000-8000-000000000002",
        username: "owner",
        canManageSubscription,
      }}
    >
      <PreviewProvider>
        <ManageLocations
          locations={[]}
          location_title="Locations"
          updateLocation={mock(() => {})}
          proAvailable={proAvailable}
        />
      </PreviewProvider>
    </DashboardScopeProvider>,
  );
}

describe("ManageLocations upgrade capability", () => {
  it("does not offer an upgrade while an admin views a free target", () => {
    renderLocations(false);

    expect(
      screen.queryByRole("link", {
        name: "Upgrade your membership to add multiple locations",
      }),
    ).toBeNull();
  });

  it("offers an eligible owner one semantic external upgrade link", () => {
    renderLocations(true);

    const link = screen.getByRole("link", {
      name: "Upgrade your membership to add multiple locations",
    });
    expect(link.getAttribute("href")).toBe("/upgrade");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel") ?? "").toContain("noopener");
    expect(link.querySelector("button")).toBeNull();
  });

  it("does not offer an upgrade to an owner whose plan already supports locations", () => {
    renderLocations(true, true);

    expect(screen.queryByRole("link")).toBeNull();
  });
});
