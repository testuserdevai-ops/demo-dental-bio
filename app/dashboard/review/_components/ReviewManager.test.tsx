import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfil) => {
    resolve = fulfil;
  });
  return { promise, resolve };
}

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

  it("preserves a review draft when its mutation rejects", async () => {
    const create = mock(async () => {
      throw new Error("network unavailable");
    });
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
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not save review",
      ),
    );
    expect(
      (screen.getByLabelText("Reviewer name") as HTMLInputElement).value,
    ).toBe("Patient");
    expect(
      (screen.getByRole("button", { name: "Save review" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
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

  it("guards a pending visibility toggle from duplicate activation", async () => {
    const pending = deferred<{
      ok: true;
      data: typeof review & { enabled: false };
    }>();
    const update = mock(() => pending.promise);
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
    fireEvent.click(toggle);
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
    pending.resolve({ ok: true, data: { ...review, enabled: false } });
    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("guards a pending reorder and reloads exactly once after success", async () => {
    const second = {
      ...review,
      id: 2,
      reviewerName: "Second patient",
      rank: 2,
    };
    const pending = deferred<{ ok: true; data: null }>();
    const reorder = mock(() => pending.promise);
    render(
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
    const save = screen.getByRole("button", { name: "Save review order" });
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(reorder).toHaveBeenCalledTimes(1));
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(save.getAttribute("aria-busy")).toBe("true");
    pending.resolve({ ok: true, data: null });
    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(reorder).toHaveBeenCalledTimes(1);
  });

  it("preserves and retries a review-order draft after rejection", async () => {
    const second = {
      ...review,
      id: 2,
      reviewerName: "Second patient",
      rank: 2,
    };
    const reorder = mock(async () => {
      if (reorder.mock.calls.length === 1)
        throw new Error("network unavailable");
      return { ok: true as const, data: null };
    });
    render(
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
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not save review order",
      ),
    );
    expect(
      screen
        .getAllByRole("article")
        .map((node) => node.querySelector("h4")?.textContent),
    ).toEqual(["Second patient", "Patient"]);
    const retry = screen.getByRole("button", { name: "Save review order" });
    expect((retry as HTMLButtonElement).disabled).toBe(false);
    expect(triggerReload).not.toHaveBeenCalled();
    fireEvent.click(retry);
    await waitFor(() => expect(reorder).toHaveBeenCalledTimes(2));
    expect(triggerReload).toHaveBeenCalledTimes(1);
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

  it("guards a pending delete and reloads exactly once after success", async () => {
    const pending = deferred<{ ok: true; data: null }>();
    const remove = mock(() => pending.promise);
    render(
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
    const dialog = screen.getByRole("alertdialog");
    const removeButton = within(dialog).getByRole("button", { name: "Delete" });
    fireEvent.click(removeButton);
    fireEvent.click(removeButton);
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect((removeButton as HTMLButtonElement).disabled).toBe(true);
    expect(removeButton.getAttribute("aria-busy")).toBe("true");
    pending.resolve({ ok: true, data: null });
    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("preserves the delete dialog and restores its action after rejection", async () => {
    const remove = mock(async () => {
      throw new Error("network unavailable");
    });
    render(
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
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not delete review",
      ),
    );
    const deleteAction = within(screen.getByRole("alertdialog")).getByRole(
      "button",
      { name: "Delete" },
    );
    expect((deleteAction as HTMLButtonElement).disabled).toBe(false);
    expect(triggerReload).not.toHaveBeenCalled();
  });
});
