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

  it("reloads once per successful toggle and zero times after a rejected toggle", async () => {
    const update = mock(async (): Promise<ActionResult<unknown>> => ({
      ok: false as const,
      code: "UPDATE_EXTERNAL_PAGE_FAILED",
      formError: "Rejected",
    }));
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

    update.mockResolvedValue({
      ok: true as const,
      data: { ...pages[0], enabled: false },
    });
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

  it("retains a reorder draft on failure and reloads once after success", async () => {
    const reorder = mock(async (): Promise<ActionResult<unknown>> => ({
      ok: false as const,
      code: "REORDER_EXTERNAL_PAGES_FAILED",
      formError: "Rejected",
    }));
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
    expect(save).toBeTruthy();
    expect(triggerReload).not.toHaveBeenCalled();

    reorder.mockResolvedValue({ ok: true as const, data: undefined });
    fireEvent.click(save);
    await waitFor(() => expect(triggerReload).toHaveBeenCalledTimes(1));
    expect(reorder).toHaveBeenLastCalledWith({ orderedIds: [12, 11] });
  });

  it("reloads once after delete success and zero times after cancel or failure", async () => {
    const remove = mock(async (): Promise<ActionResult<unknown>> => ({
      ok: false as const,
      code: "DELETE_EXTERNAL_PAGE_FAILED",
      formError: "Rejected",
    }));
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
    expect(triggerReload).not.toHaveBeenCalled();

    remove.mockResolvedValue({ ok: true as const, data: undefined });
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
