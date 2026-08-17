import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

mock.module("server-only", () => ({}));

const uploadLocationImage = mock();
const removeLocationImages = mock();
const retryLocationImageCleanup = mock();

mock.module("@/app/contexts/DashboardScopeContext", () => ({
  useDashboardScope: () => ({
    effectiveUserId: "00000000-0000-4000-8000-000000000001",
    dentistryId: "00000000-0000-4000-8000-000000000002",
  }),
}));
mock.module("../GoogleMapAutocomplete", () => ({
  default: ({ id }: { id: string }) => (
    <fieldset>
      <label>
        Business name
        <input defaultValue="Main clinic" name="business_name" />
      </label>
      <label>
        Address
        <input defaultValue="1 High Street" name="full_address" />
      </label>
      <input defaultValue="UK" name="country" />
      <input defaultValue="London" name={`city-${id}`} />
      <input defaultValue="Central" name="area" />
      <input defaultValue="51.5" name="latitude" />
      <input defaultValue="-0.1" name="longitude" />
    </fieldset>
  ),
}));
mock.module("../_lib/uploads", () => ({
  LOCATION_IMAGE_ACCEPT: "image/jpeg,image/png,image/webp",
  removeLocationImages,
  retryLocationImageCleanup,
  uploadLocationImage,
  validateLocationImage: (file: File) =>
    file.type === "image/webp" ? null : "Choose a supported image",
}));

const { LocationForm } = await import("./LocationForm");

const file = new File(["image"], "clinic.webp", { type: "image/webp" });
const objectPath =
  "00000000-0000-4000-8000-000000000001/dentistries/00000000-0000-4000-8000-000000000002/locations/00000000-0000-4000-8000-000000000003/image.webp";
const publicUrl = `https://storage.test/storage/v1/object/public/location-images/${objectPath}`;
const existingLocation = {
  id: "00000000-0000-4000-8000-000000000003",
  businessName: "Main clinic",
  fullAddress: "1 High Street",
  country: "UK",
  city: "London",
  area: "Central",
  latitude: 51.5,
  longitude: -0.1,
  imageUrl: "http://localhost:54321/existing-location.webp",
  imageAlt: "Main clinic entrance",
  imageDecorative: false,
  updatedAt: "2026-08-17T00:00:00.000Z",
};

describe("LocationForm media lifecycle", () => {
  beforeEach(() => {
    uploadLocationImage.mockReset();
    uploadLocationImage.mockResolvedValue({
      ok: true,
      data: { objectPath, publicUrl },
    });
    removeLocationImages.mockReset();
    removeLocationImages.mockResolvedValue(undefined);
    retryLocationImageCleanup.mockReset();
    retryLocationImageCleanup.mockResolvedValue(undefined);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: () => "blob:location-preview",
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: () => undefined,
    });
  });

  it("uploads informative media, saves once, cleans queued objects, and completes once", async () => {
    const create = mock(async (_value: unknown) => ({
      ok: true as const,
      data: { id: "saved" },
    }));
    const onDone = mock();
    render(
      <LocationForm
        mutations={
          {
            createLocation: { mutateAsync: create },
            updateLocation: { mutateAsync: mock() },
          } as never
        }
        onDone={onDone}
      />,
    );

    fireEvent.change(screen.getByLabelText("Add location image"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("switch", { name: "Decorative image" }));
    fireEvent.change(screen.getByLabelText("Image description"), {
      target: { value: "Main clinic entrance" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(uploadLocationImage).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        imageUrl: publicUrl,
        imageAlt: "Main clinic entrance",
        imageDecorative: false,
      }),
    );
    expect(retryLocationImageCleanup).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(removeLocationImages).not.toHaveBeenCalled();
  });

  it("keeps the full draft and removes the abandoned upload when save fails", async () => {
    const create = mock(async (_value: unknown) => ({
      ok: false as const,
      code: "CREATE_FAILED",
      formError: "Could not save location",
    }));
    const onDone = mock();
    render(
      <LocationForm
        mutations={
          {
            createLocation: { mutateAsync: create },
            updateLocation: { mutateAsync: mock() },
          } as never
        }
        onDone={onDone}
      />,
    );

    fireEvent.change(screen.getByLabelText("Business name"), {
      target: { value: "Unsaved clinic" },
    });
    fireEvent.change(screen.getByLabelText("Add location image"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(removeLocationImages).toHaveBeenCalledWith([objectPath]);
    expect(
      (screen.getByLabelText("Business name") as HTMLInputElement).value,
    ).toBe("Unsaved clinic");
    expect(screen.getByLabelText("Replace location image")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("preserves the draft and performs no save or completion on upload failure", async () => {
    uploadLocationImage.mockResolvedValueOnce({
      ok: false,
      code: "UPLOAD_FAILED",
      formError: "Location image could not be uploaded",
    });
    const create = mock();
    const onDone = mock();
    render(
      <LocationForm
        mutations={
          {
            createLocation: { mutateAsync: create },
            updateLocation: { mutateAsync: mock() },
          } as never
        }
        onDone={onDone}
      />,
    );

    fireEvent.change(screen.getByLabelText("Business name"), {
      target: { value: "Retry clinic" },
    });
    fireEvent.change(screen.getByLabelText("Add location image"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));

    await waitFor(() =>
      expect(
        screen.getByText("Location image could not be uploaded"),
      ).toBeTruthy(),
    );
    expect(create).not.toHaveBeenCalled();
    expect(removeLocationImages).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(
      (screen.getByLabelText("Business name") as HTMLInputElement).value,
    ).toBe("Retry clinic");
  });

  it("removes existing media through the same revision-checked update", async () => {
    const update = mock(async (_value: unknown) => ({
      ok: true as const,
      data: { ...existingLocation, imageUrl: null },
    }));
    const onDone = mock();
    render(
      <LocationForm
        authoritativeRevision={existingLocation.updatedAt}
        location={existingLocation}
        mutations={
          {
            createLocation: { mutateAsync: mock() },
            updateLocation: { mutateAsync: update },
          } as never
        }
        onDone={onDone}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Remove location image" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Update location" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(uploadLocationImage).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedUpdatedAt: existingLocation.updatedAt,
        imageUrl: null,
        imageAlt: "",
        imageDecorative: true,
      }),
    );
  });
});
