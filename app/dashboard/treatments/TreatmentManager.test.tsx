import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TreatmentManager from "./TreatmentManager";

const item = {
  id: "one",
  title: "Check-up",
  description: "Routine",
  kind: "treatment" as const,
  rank: 1,
};
const secondItem = { ...item, id: "two", title: "Whitening", rank: 2 };
describe("TreatmentManager", () => {
  it("confirms deletes through its atomic Action", async () => {
    const onDelete = mock(async () => ({ ok: true as const, data: undefined }));
    render(
      <TreatmentManager
        kind="treatment"
        items={[item]}
        loading={false}
        onUpdate={mock(async () => ({ ok: true as const, data: item }))}
        onDelete={onDelete}
        onReorder={mock(async () => ({ ok: true as const, data: undefined }))}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Check-up" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete treatment" }));
    await waitFor(() =>
      expect(onDelete).toHaveBeenCalledWith({ treatmentId: "one" }),
    );
  });

  it("opens an edit form without writing, preserves failed values, and refocuses after success", async () => {
    const onUpdate = mock(async () => ({
      ok: false as const,
      code: "UPDATE_FAILED",
      formError: "Update failed",
    }));
    render(
      <TreatmentManager
        kind="treatment"
        items={[item]}
        loading={false}
        onUpdate={onUpdate}
        onDelete={mock(async () => ({ ok: true as const, data: undefined }))}
        onReorder={mock(async () => ({ ok: true as const, data: undefined }))}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Check-up" });
    fireEvent.click(trigger);
    expect(onUpdate).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Edit treatment" });
    const title = screen.getByRole("textbox", { name: "Treatment title" });
    fireEvent.change(title, { target: { value: "Updated check-up" } });
    fireEvent.click(screen.getByRole("button", { name: "Update treatment" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Update failed"),
    );
    expect((title as HTMLInputElement).value).toBe("Updated check-up");
    onUpdate.mockImplementation(() =>
      Promise.resolve({
        ok: true as const,
        data: { ...item, title: "Updated check-up" },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Update treatment" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(2));
  });

  it("moves by keyboard buttons, announces a one-based position, retains focus, and cancels", () => {
    render(
      <TreatmentManager
        kind="treatment"
        items={[item, secondItem]}
        loading={false}
        onUpdate={mock(async () => ({ ok: true as const, data: item }))}
        onDelete={mock(async () => ({ ok: true as const, data: undefined }))}
        onReorder={mock(async () => ({ ok: true as const, data: undefined }))}
      />,
    );
    const move = screen.getByRole("button", { name: "Move Check-up down" });
    fireEvent.click(move);
    expect(screen.getByText("Check-up moved to position 2")).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Check-up" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
    expect(screen.getByText("Treatment order cancelled")).toBeTruthy();
  });
});
