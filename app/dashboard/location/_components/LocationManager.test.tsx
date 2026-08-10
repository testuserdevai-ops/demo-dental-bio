import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
mock.module("server-only", () => ({}));
mock.module("../_lib/hooks", () => ({
  useLocationAggregate: () => ({}),
  useLocationMutations: () => ({}),
}));
mock.module("../GoogleMapAutocomplete", () => ({ default: () => null }));
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload: () => {} }),
}));
mock.module("@/app/contexts/DashboardScopeContext", () => ({
  useDashboardScope: () => ({ canManageSubscription: true }),
}));
const { default: LocationManager } = await import("./LocationManager");
const data = {
  title: "Locations",
  canAddLocation: true,
  locations: [
    {
      id: crypto.randomUUID(),
      businessName: "Main clinic",
      fullAddress: "1 High Street",
      country: "UK",
      city: "London",
      area: "Central",
      latitude: 51.5,
      longitude: -0.1,
      updatedAt: new Date().toISOString(),
    },
  ],
};
describe("LocationManager", () => {
  it("renders readable bounded cards and preserves a failed title draft", async () => {
    const saveTitle = mock(async () => ({
      ok: false as const,
      code: "UPDATE_FAILED",
      formError: "Could not save title",
    }));
    render(
      <LocationManager
        data={data}
        enabled
        loading={false}
        mutations={{ saveTitle: { mutateAsync: saveTitle } } as never}
      />,
    );
    expect(screen.getByRole("article").className).toContain("max-h-36");
    const input = screen.getByLabelText("Location title");
    fireEvent.change(input, { target: { value: "Find our clinics" } });
    fireEvent.click(screen.getByRole("button", { name: "Save title" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect((input as HTMLInputElement).value).toBe("Find our clinics");
  });
});
