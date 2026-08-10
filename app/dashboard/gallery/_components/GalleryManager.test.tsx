import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

mock.module("server-only", () => ({}));
mock.module("../_lib/hooks", () => ({
  useGalleryAggregate: () => ({}),
  useGalleryMutations: () => ({}),
}));
const uploadGalleryImage = mock(async () => ({
  ok: true as const,
  data: {
    objectPath: "owner/gallery/new.jpg",
    publicUrl: "https://example.com/new.jpg",
  },
}));
const removeGalleryImages = mock(async () => {});
const retryGalleryImageCleanup = mock(async () => {});
mock.module("../_lib/uploads", () => ({
  uploadGalleryImage,
  removeGalleryImages,
  retryGalleryImageCleanup,
  galleryImagePath: () => "owner/gallery/old.jpg",
}));
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload: () => {} }),
}));
const { default: GalleryManager } = await import("./GalleryManager");

const dental = {
  id: 1,
  title: "Smile makeover",
  beforeImageUrl: "https://example.com/before.jpg",
  afterImageUrl: "https://example.com/after.jpg",
  beforeLabel: "Before",
  afterLabel: "After",
  rank: 1,
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("GalleryManager", () => {
  beforeEach(() => {
    uploadGalleryImage.mockClear();
    removeGalleryImages.mockClear();
  });

  it("keeps an invalid create dialog and its draft open", async () => {
    const createDental = mock(async () => ({
      ok: false as const,
      code: "CREATE_FAILED",
      formError: "Could not save gallery",
    }));
    render(
      <GalleryManager
        dental={[]}
        general={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ createDental: { mutateAsync: createDental } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add dental gallery" }));
    fireEvent.change(screen.getByLabelText("Gallery title"), {
      target: { value: "Smile makeover" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save gallery" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(
      (screen.getByLabelText("Gallery title") as HTMLInputElement).value,
    ).toBe("Smile makeover");
  });

  it("moves a gallery with keyboard controls and saves visible IDs", async () => {
    const reorderDental = mock(async () => ({
      ok: true as const,
      data: undefined,
    }));
    render(
      <GalleryManager
        dental={[dental, { ...dental, id: 2, title: "Whitening", rank: 2 }]}
        general={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ reorderDental: { mutateAsync: reorderDental } } as never}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Move Smile makeover down" }),
    );
    expect(screen.getByText("Smile makeover moved to position 2")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Save dental gallery order" }),
    );
    await waitFor(() =>
      expect(reorderDental).toHaveBeenCalledWith({ orderedIds: [2, 1] }),
    );
  });

  it("replaces media only after a successful gallery update", async () => {
    const updateDental = mock(async () => ({
      ok: true as const,
      data: dental,
    }));
    render(
      <GalleryManager
        dental={[dental]}
        general={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ updateDental: { mutateAsync: updateDental } } as never}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Edit Smile makeover" }),
    );
    fireEvent.change(screen.getByLabelText("Gallery title"), {
      target: { value: "Updated smile" },
    });
    fireEvent.change(screen.getByLabelText("Replace before image (optional)"), {
      target: {
        files: [new File(["image"], "replacement.jpg", { type: "image/jpeg" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update gallery" }));
    await waitFor(() =>
      expect(updateDental).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated smile",
          beforeImageUrl: "https://example.com/new.jpg",
        }),
      ),
    );
    expect(removeGalleryImages).toHaveBeenCalledWith(["owner/gallery/old.jpg"]);
  });

  it("updates the visible state after the authoritative toggle succeeds", async () => {
    const updateDental = mock(async () => ({
      ok: true as const,
      data: { ...dental, enabled: false },
    }));
    render(
      <GalleryManager
        dental={[dental]}
        general={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ updateDental: { mutateAsync: updateDental } } as never}
      />,
    );
    fireEvent.click(
      screen.getByRole("switch", { name: "Hide Smile makeover" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Show Smile makeover" }),
      ).toBeTruthy(),
    );
    expect(updateDental).toHaveBeenCalledWith(
      expect.objectContaining({ id: dental.id, enabled: false }),
    );
  });

  it("keeps before-and-after cards compact on narrow dashboards", () => {
    render(
      <GalleryManager
        dental={[dental]}
        general={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{} as never}
      />,
    );

    const card = screen.getByTestId("gallery-card");
    expect(card.className).toContain("max-h-[30rem]");
    expect(card.querySelector(".grid-cols-2")).toBeTruthy();
  });
});
