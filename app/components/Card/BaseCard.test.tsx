import { afterEach, describe, expect, it } from "bun:test";
import * as React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import BaseCard from "./BaseCard";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("BaseCard delete confirmation", () => {
  afterEach(cleanup);

  it("restores focus to the delete trigger after cancellation", async () => {
    render(
      <BaseCard showDelete deleteOkText="Delete example">
        Example
      </BaseCard>,
    );
    const trigger = screen.getByRole("button", { name: "Delete example" });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("keeps a destructive confirmation open and its controls locked until deletion succeeds", async () => {
    const request = deferred<void>();
    let calls = 0;
    render(
      <BaseCard
        showDelete
        deleteOkText="Delete item"
        onConfirmDelete={() => {
          calls += 1;
          return request.promise;
        }}
      >
        Item
      </BaseCard>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete item" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete item?" });
    expect(dialog).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Cancel" }),
      ),
    );

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete item" }),
    );
    expect(calls).toBe(1);
    expect(
      screen.getByRole("button", { name: "Cancel" }).hasAttribute("disabled"),
    ).toBe(true);

    request.resolve();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  }, 10_000);

  it("retains the deletion target after a failed action", async () => {
    render(
      <BaseCard
        showDelete
        deleteOkText="Delete item"
        onConfirmDelete={() => Promise.reject(new Error("delete failed"))}
      >
        Item
      </BaseCard>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete item" }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Delete item",
      }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("alertdialog", { name: "Delete item?" }),
      ).toBeTruthy(),
    );
  });
});
