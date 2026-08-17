import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

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
const triggerReload = mock(() => {});
mock.module("../_lib/uploads", () => ({
  uploadGalleryImage,
  removeGalleryImages,
  retryGalleryImageCleanup,
  galleryImagePath: () => "owner/gallery/old.jpg",
}));
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload }),
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
const general = {
  id: 11,
  title: "Welcoming studio",
  imageUrl: "https://example.com/studio.jpg",
  rank: 1,
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

type InventoryKind = "dental" | "general";
type Operation = "create" | "update" | "reorder" | "toggle" | "delete";
type Outcome = "success" | "failure" | "rejection";

const mutationCases = (["dental", "general"] as const).flatMap((kind) =>
  (["create", "update", "reorder", "toggle", "delete"] as const).flatMap(
    (operation) =>
      (["success", "failure", "rejection"] as const).map((outcome) => ({
        kind,
        operation,
        outcome,
      })),
  ),
);

function mutationKey(kind: InventoryKind, operation: Operation) {
  const suffix = kind === "dental" ? "Dental" : "General";
  if (operation === "reorder") return `reorder${suffix}`;
  if (operation === "delete") return `delete${suffix}`;
  if (operation === "create") return `create${suffix}`;
  return `update${suffix}`;
}

describe("GalleryManager", () => {
  beforeEach(() => {
    uploadGalleryImage.mockClear();
    removeGalleryImages.mockClear();
    triggerReload.mockClear();
  });

  afterEach(cleanup);

  for (const { kind, operation, outcome } of mutationCases) {
    it(`${kind} ${operation} reload contract on ${outcome}`, async () => {
      const mutateAsync = mock(async () => {
        if (outcome === "rejection") throw new Error("Transport unavailable");
        return outcome === "success"
          ? { ok: true as const, data: undefined }
          : {
              ok: false as const,
              code: "MUTATION_FAILED",
              formError: "Gallery mutation failed",
            };
      });
      const item = kind === "dental" ? dental : general;
      const second =
        kind === "dental"
          ? { ...dental, id: 2, title: "Whitening", rank: 2 }
          : { ...general, id: 12, title: "Reception", rank: 2 };
      const items = operation === "create" ? [] : [item, second];
      const mutations = {
        [mutationKey(kind, operation)]: { mutateAsync },
      } as never;

      render(
        <GalleryManager
          dental={kind === "dental" ? (items as (typeof dental)[]) : []}
          general={kind === "general" ? (items as (typeof general)[]) : []}
          loading={false}
          enabled
          userId="owner"
          mutations={mutations}
        />,
      );

      if (operation === "create") {
        fireEvent.click(
          screen.getByRole("button", {
            name:
              kind === "dental" ? "Add dental gallery" : "Add general gallery",
          }),
        );
        fireEvent.change(screen.getByLabelText("Gallery title"), {
          target: { value: `${kind} created` },
        });
        const file = new File(["image"], "gallery.webp", {
          type: "image/webp",
        });
        if (kind === "dental") {
          fireEvent.change(screen.getByLabelText("Before image"), {
            target: { files: [file] },
          });
          fireEvent.change(screen.getByLabelText("After image"), {
            target: { files: [file] },
          });
        } else {
          fireEvent.change(screen.getByLabelText("Gallery image"), {
            target: { files: [file] },
          });
        }
        fireEvent.click(screen.getByRole("button", { name: "Save gallery" }));
      } else if (operation === "update") {
        fireEvent.click(
          screen.getByRole("button", { name: `Edit ${item.title}` }),
        );
        fireEvent.change(screen.getByLabelText("Gallery title"), {
          target: { value: `${item.title} updated` },
        });
        fireEvent.click(screen.getByRole("button", { name: "Update gallery" }));
      } else if (operation === "reorder") {
        fireEvent.click(
          screen.getByRole("button", { name: `Move ${item.title} down` }),
        );
        fireEvent.click(
          screen.getByRole("button", {
            name: `Save ${kind} gallery order`,
          }),
        );
      } else if (operation === "toggle") {
        fireEvent.click(
          screen.getByRole("button", { name: `Hide ${item.title}` }),
        );
      } else {
        fireEvent.click(
          screen.getByRole("button", { name: `Delete ${item.title}` }),
        );
        fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
      }

      await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
      if (outcome === "success") {
        await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
      } else {
        await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
        expect(triggerReload).toHaveBeenCalledTimes(0);
        if (operation === "toggle") {
          expect(
            screen
              .getByRole("button", { name: `Hide ${item.title}` })
              .hasAttribute("disabled"),
          ).toBe(false);
        }
      }
    });
  }

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

  it("reconciles gallery order from an authoritative refetch", () => {
    const original = [
      dental,
      { ...dental, id: 2, title: "Whitening", rank: 2 },
    ];
    const { rerender } = render(
      <GalleryManager
        dental={original}
        general={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{} as never}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Move Smile makeover down" }),
    );
    expect(screen.getAllByTestId("gallery-card")[0].textContent).toContain(
      "Whitening",
    );

    rerender(
      <GalleryManager
        dental={[
          { ...dental, id: 2, title: "Whitening", rank: 1 },
          { ...dental, rank: 2 },
        ]}
        general={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{} as never}
      />,
    );

    expect(screen.getAllByTestId("gallery-card")[0].textContent).toContain(
      "Whitening",
    );
  });

  it("rolls a failed reorder back to the authoritative gallery order", async () => {
    const reorderDental = mock(async () => ({
      ok: false as const,
      code: "REORDER_FAILED",
      formError: "Could not save gallery order",
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
    fireEvent.click(
      screen.getByRole("button", { name: "Save dental gallery order" }),
    );

    await waitFor(() => expect(reorderDental).toHaveBeenCalledTimes(1));
    expect(screen.getAllByTestId("gallery-card")[0].textContent).toContain(
      "Smile makeover",
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
      screen.getByRole("button", { name: "Hide Smile makeover" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Show Smile makeover" }),
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
