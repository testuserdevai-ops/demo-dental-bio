import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

mock.module("server-only", () => ({}));
mock.module("../_lib/hooks", () => ({
  useReviewAggregate: () => ({}),
  useReviewMutations: () => ({}),
}));
const uploadReviewImage = mock(async () => ({
  ok: true as const,
  data: {
    objectPath: "owner/review/new.jpg",
    publicUrl: "https://example.com/new.jpg",
  },
}));
const removeReviewImages = mock(async () => {});
const triggerReload = mock(() => {});
mock.module("../_lib/uploads", () => ({
  uploadReviewImage,
  removeReviewImages,
  retryReviewImageCleanup: mock(async () => {}),
  reviewImagePath: () => "owner/review/old.jpg",
}));
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload }),
}));
const { default: ReviewManager } = await import("./ReviewManager");

const review = {
  id: 1,
  reviewerName: "Patient",
  content: "A wonderful and thoughtful appointment.",
  stars: 5,
  imageUrl: "",
  platform: "Google",
  rank: 1,
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("ReviewManager", () => {
  beforeEach(() => {
    uploadReviewImage.mockClear();
    removeReviewImages.mockClear();
    triggerReload.mockClear();
  });

  it("preserves a review draft when its Action fails", async () => {
    const create = mock(async () => ({
      ok: false as const,
      code: "CREATE_FAILED",
      formError: "Could not save review",
    }));
    render(
      <ReviewManager
        reviews={[]}
        externalPages={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ create: { mutateAsync: create } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add review" }));
    fireEvent.change(screen.getByLabelText("Reviewer name"), {
      target: { value: "Patient" },
    });
    fireEvent.change(screen.getByLabelText("Review content"), {
      target: { value: review.content },
    });
    fireEvent.change(screen.getByLabelText("Review platform"), {
      target: { value: "Google" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save review" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(
      (screen.getByLabelText("Reviewer name") as HTMLInputElement).value,
    ).toBe("Patient");
    expect(triggerReload).not.toHaveBeenCalled();
  });

  it("reloads exactly once after a successful review create", async () => {
    const create = mock(async () => ({ ok: true as const, data: review }));
    render(
      <ReviewManager
        reviews={[]}
        externalPages={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ create: { mutateAsync: create } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add review" }));
    fireEvent.change(screen.getByLabelText("Reviewer name"), {
      target: { value: "Patient" },
    });
    fireEvent.change(screen.getByLabelText("Review content"), {
      target: { value: review.content },
    });
    fireEvent.change(screen.getByLabelText("Review platform"), {
      target: { value: "Google" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save review" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
    expect(triggerReload).toHaveBeenCalledTimes(1);
  });

  it("removes stale media only after a successful review replacement", async () => {
    const update = mock(async () => ({ ok: true as const, data: review }));
    render(
      <ReviewManager
        reviews={[{ ...review, imageUrl: "https://example.com/old.jpg" }]}
        externalPages={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ update: { mutateAsync: update } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Patient" }));
    fireEvent.change(
      screen.getByLabelText("Replace reviewer image (optional)"),
      {
        target: {
          files: [
            new File(["image"], "replacement.jpg", { type: "image/jpeg" }),
          ],
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Update review" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: "https://example.com/new.jpg" }),
      ),
    );
    expect(removeReviewImages).toHaveBeenCalledWith(["owner/review/old.jpg"]);
    expect(triggerReload).toHaveBeenCalledTimes(1);
  });

  it("updates review visibility after the authoritative toggle succeeds", async () => {
    const update = mock(async () => ({
      ok: true as const,
      data: { ...review, enabled: false },
    }));
    render(
      <ReviewManager
        reviews={[review]}
        externalPages={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ update: { mutateAsync: update } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hide Patient" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Show Patient" })).toBeTruthy(),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: review.id, enabled: false }),
    );
    expect(screen.getByRole("article").className).toContain("max-h-44");
    expect(triggerReload).toHaveBeenCalledTimes(1);
  });

  it("reloads exactly once after a successful reorder and never after rejection", async () => {
    const second = {
      ...review,
      id: 2,
      reviewerName: "Second patient",
      rank: 2,
    };
    const reorder = mock(async () => ({ ok: true as const, data: null }));
    const { unmount } = render(
      <ReviewManager
        reviews={[review, second]}
        externalPages={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ reorder: { mutateAsync: reorder } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Move Patient down" }));
    fireEvent.click(screen.getByRole("button", { name: "Save review order" }));
    await waitFor(() => expect(reorder).toHaveBeenCalledTimes(1));
    expect(triggerReload).toHaveBeenCalledTimes(1);
    unmount();

    triggerReload.mockClear();
    const rejected = mock(async () => {
      throw new Error("network unavailable");
    });
    render(
      <ReviewManager
        reviews={[review, second]}
        externalPages={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ reorder: { mutateAsync: rejected } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Move Patient down" }));
    fireEvent.click(screen.getByRole("button", { name: "Save review order" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not save review order",
      ),
    );
    expect(triggerReload).not.toHaveBeenCalled();
  });

  it("keeps a rejected toggle actionable and does not reload the preview", async () => {
    const update = mock(async () => {
      throw new Error("network unavailable");
    });
    render(
      <ReviewManager
        reviews={[review]}
        externalPages={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ update: { mutateAsync: update } } as never}
      />,
    );
    const toggle = screen.getByRole("button", { name: "Hide Patient" });
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not update review",
      ),
    );
    expect((toggle as HTMLButtonElement).disabled).toBe(false);
    expect(triggerReload).not.toHaveBeenCalled();
  });

  it("reloads once after delete success and preserves the dialog after rejection", async () => {
    const remove = mock(async () => ({ ok: true as const, data: null }));
    const { unmount } = render(
      <ReviewManager
        reviews={[review]}
        externalPages={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ remove: { mutateAsync: remove } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Patient" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(triggerReload).toHaveBeenCalledTimes(1);
    unmount();

    triggerReload.mockClear();
    const rejected = mock(async () => {
      throw new Error("network unavailable");
    });
    render(
      <ReviewManager
        reviews={[review]}
        externalPages={[]}
        loading={false}
        enabled
        userId="owner"
        mutations={{ remove: { mutateAsync: rejected } } as never}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Patient" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not delete review",
      ),
    );
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(triggerReload).not.toHaveBeenCalled();
  });
});
