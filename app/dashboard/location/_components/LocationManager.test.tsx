import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const triggerReload = mock();
const retryLocationImageCleanup = mock();
mock.module("server-only", () => ({}));
mock.module("../_lib/hooks", () => ({
  useLocationAggregate: () => ({}),
  useLocationMutations: () => ({}),
}));
mock.module("../GoogleMapAutocomplete", () => ({ default: () => null }));
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload }),
}));
mock.module("@/app/contexts/DashboardScopeContext", () => ({
  useDashboardScope: () => ({
    canManageSubscription: true,
    effectiveUserId: crypto.randomUUID(),
    dentistryId: crypto.randomUUID(),
  }),
}));
mock.module("../_lib/uploads", () => ({
  retryLocationImageCleanup,
  uploadLocationImage: mock(),
  removeLocationImages: mock(),
  validateLocationImage: () => null,
  LOCATION_IMAGE_ACCEPT: "image/jpeg,image/png,image/webp",
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
      imageUrl: null,
      imageAlt: "",
      imageDecorative: true,
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

  it("reloads preview once after a successful delete and never after failure", async () => {
    triggerReload.mockClear();
    retryLocationImageCleanup.mockClear();
    retryLocationImageCleanup.mockResolvedValue(undefined);
    const remove = mock(async () => ({ ok: true as const, data: undefined }));
    const { rerender } = render(
      <LocationManager
        data={data}
        enabled
        loading={false}
        mutations={
          {
            saveTitle: { mutateAsync: mock() },
            deleteLocation: { mutateAsync: remove },
          } as never
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Main clinic" }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(retryLocationImageCleanup).toHaveBeenCalledTimes(1);

    triggerReload.mockClear();
    remove.mockResolvedValueOnce({
      ok: false,
      code: "DELETE_FAILED",
      formError: "Could not delete location",
    } as never);
    rerender(
      <LocationManager
        data={data}
        enabled
        loading={false}
        mutations={
          {
            saveTitle: { mutateAsync: mock() },
            deleteLocation: { mutateAsync: remove },
          } as never
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Main clinic" }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
    await waitFor(() =>
      expect(screen.getByText("Could not delete location")).toBeTruthy(),
    );
    expect(triggerReload).not.toHaveBeenCalled();
  });
});
