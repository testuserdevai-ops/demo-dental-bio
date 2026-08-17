import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ActionResult } from "@/lib/forms/action-result";

mock.module("server-only", () => ({}));
const triggerReload = mock(() => {});
mock.module("@/app/contexts/PreviewContext", () => ({
  usePreview: () => ({ triggerReload }),
}));

const { ExternalReviewPagesManager } =
  await import("./ExternalReviewPagesManager");

const pages = [
  {
    id: 11,
    link: "https://first.reviews.test/path",
    rank: 1,
    enabled: true,
  },
  {
    id: 12,
    link: "https://second.reviews.test/path",
    rank: 2,
    enabled: true,
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfil) => {
    resolve = fulfil;
  });
  return { promise, resolve };
}

describe("ExternalReviewPagesManager", () => {
  beforeEach(() => triggerReload.mockClear());

  it("reloads exactly once after an authoritative create and retains failed drafts", async () => {
    const create = mock(async (): Promise<ActionResult<unknown>> => ({
      ok: false as const,
      code: "CREATE_EXTERNAL_PAGE_FAILED",
      formError: "Could not save destination",
    }));
    render(
      <ExternalReviewPagesManager
        pages={[]}
        enabled
        mutations={{ createExternalPage: { mutateAsync: create } }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Add external review page" }),
    );
    const input = screen.getByLabelText("External review page URL");
    fireEvent.change(input, { target: { value: "https://new.reviews.test" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Save external review page" }),
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect((input as HTMLInputElement).value).toBe("https://new.reviews.test");
    expect(triggerReload).not.toHaveBeenCalled();

    create.mockResolvedValue({
      ok: true as const,
      data: {
        id: 13,
        link: "https://new.reviews.test/",
        rank: 1,
        enabled: true,
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save external review page" }),
    );
    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenLastCalledWith({
      link: "https://new.reviews.test/",
    });
  });

  it("does not mutate or reload for client-invalid input", async () => {
    const create = mock(async (): Promise<ActionResult<unknown>> => ({
      ok: true as const,
      data: pages[0],
    }));
    render(
      <ExternalReviewPagesManager
        pages={[]}
        enabled
        mutations={{ createExternalPage: { mutateAsync: create } }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add external review page" }),
    );
    fireEvent.change(screen.getByLabelText("External review page URL"), {
      target: { value: "http://unsafe.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save external review page" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("Enter a credential-free HTTPS URL"),
      ).toBeTruthy(),
    );
    expect(create).not.toHaveBeenCalled();
    expect(triggerReload).not.toHaveBeenCalled();
  });

  it("retains a form draft and restores submit after a rejected transport", async () => {
    const create = mock(async () => {
      throw new Error("network unavailable");
    });
    render(
      <ExternalReviewPagesManager
        pages={[]}
        enabled
        mutations={{ createExternalPage: { mutateAsync: create } }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add external review page" }),
    );
    const input = screen.getByLabelText("External review page URL");
    fireEvent.change(input, { target: { value: "https://new.reviews.test" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Save external review page" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not save external review page",
      ),
    );
    expect((input as HTMLInputElement).value).toBe("https://new.reviews.test");
    expect(
      (
        screen.getByRole("button", {
          name: "Save external review page",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(triggerReload).not.toHaveBeenCalled();
  });

  it("restores a rejected toggle and reloads once after retry", async () => {
    const update = mock(async (): Promise<ActionResult<unknown>> => {
      if (update.mock.calls.length === 1)
        throw new Error("network unavailable");
      return {
        ok: true as const,
        data: { ...pages[0], enabled: false },
      };
    });
    render(
      <ExternalReviewPagesManager
        pages={pages}
        enabled
        mutations={{ updateExternalPage: { mutateAsync: update } }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Hide first.reviews.test" }),
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(triggerReload).not.toHaveBeenCalled();

    const toggle = screen.getByRole("button", {
      name: "Hide first.reviews.test",
    });
    expect((toggle as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(
      screen.getByRole("button", { name: "Hide first.reviews.test" }),
    );
    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenLastCalledWith({
      id: 11,
      link: pages[0].link,
      enabled: false,
    });
  });

  it("retains a reorder draft after rejection and reloads once after retry", async () => {
    const reorder = mock(async (): Promise<ActionResult<unknown>> => {
      if (reorder.mock.calls.length === 1)
        throw new Error("network unavailable");
      return { ok: true as const, data: undefined };
    });
    render(
      <ExternalReviewPagesManager
        pages={pages}
        enabled
        mutations={{ reorderExternalPages: { mutateAsync: reorder } }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Move second.reviews.test up" }),
    );
    const save = screen.getByRole("button", {
      name: "Save external review page order",
    });
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(
      screen
        .getAllByRole("article")
        .map((node) => node.querySelector("h4")?.textContent),
    ).toEqual(["second.reviews.test", "first.reviews.test"]);
    expect((save as HTMLButtonElement).disabled).toBe(false);
    expect(triggerReload).not.toHaveBeenCalled();

    fireEvent.click(save);
    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(reorder).toHaveBeenLastCalledWith({ orderedIds: [12, 11] });
  });

  it("guards a pending external-page reorder from duplicate activation", async () => {
    const pending = deferred<ActionResult<unknown>>();
    const reorder = mock(() => pending.promise);
    render(
      <ExternalReviewPagesManager
        pages={pages}
        enabled
        mutations={{ reorderExternalPages: { mutateAsync: reorder } }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Move second.reviews.test up" }),
    );
    const save = screen.getByRole("button", {
      name: "Save external review page order",
    });
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(reorder).toHaveBeenCalledTimes(1));
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(save.getAttribute("aria-busy")).toBe("true");
    pending.resolve({ ok: true as const, data: undefined });
    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(reorder).toHaveBeenCalledTimes(1);
  });

  it("restores a rejected delete dialog and reloads once after retry", async () => {
    const remove = mock(async (): Promise<ActionResult<unknown>> => {
      if (remove.mock.calls.length === 1)
        throw new Error("network unavailable");
      return { ok: true as const, data: undefined };
    });
    render(
      <ExternalReviewPagesManager
        pages={pages}
        enabled
        mutations={{ deleteExternalPage: { mutateAsync: remove } }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete first.reviews.test" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(remove).not.toHaveBeenCalled();
    expect(triggerReload).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Delete first.reviews.test" }),
    );
    fireEvent.click(
      within(
        screen.getByRole("alertdialog", {
          name: "Delete external review page?",
        }),
      ).getByRole("button", { name: "Delete" }),
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(
      screen.getByRole("alertdialog", {
        name: "Delete external review page?",
      }),
    ).toBeTruthy();
    expect(
      (
        within(
          screen.getByRole("alertdialog", {
            name: "Delete external review page?",
          }),
        ).getByRole("button", { name: "Delete" }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(triggerReload).not.toHaveBeenCalled();

    fireEvent.click(
      within(
        screen.getByRole("alertdialog", {
          name: "Delete external review page?",
        }),
      ).getByRole("button", { name: "Delete" }),
    );
    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(remove).toHaveBeenCalledWith({ id: 11 });
  });
});
