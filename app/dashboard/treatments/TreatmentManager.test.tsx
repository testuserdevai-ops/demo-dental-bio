// @ts-nocheck -- Bun provides test globals at runtime.
import React from "react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const originalFetch = globalThis.fetch;
const unlink = mock(() => Promise.resolve({ error: null }));
const removeTreatment = mock(() => Promise.resolve({ error: null }));
const fetchResult = {
  data: [
    {
      treatment_id: "treatment-1",
      rank: 1,
      treatments: { title: "Check-up", description: "Routine" },
    },
  ],
  error: null,
};

mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ order: () => Promise.resolve(fetchResult) }),
        }),
      }),
      delete: () => ({
        eq: () =>
          table === "dentistry_treatments" ? { eq: unlink } : removeTreatment(),
      }),
      update: () => ({
        eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
    }),
  }),
}));

mock.module("react-dnd", () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDrag: () => [{}, (node: HTMLElement) => node],
  useDrop: () => [{}, (node: HTMLElement) => node],
}));

const { default: TreatmentManager } = await import("./TreatmentManager");

afterEach(() => {
  cleanup();
  unlink.mockClear();
  removeTreatment.mockClear();
  globalThis.fetch = originalFetch;
});

describe("TreatmentManager deletion confirmation", () => {
  const item = {
    treatment_id: "treatment-1",
    title: "Check-up",
    description: "Routine",
    rank: 1,
  };

  it("does not delete when the confirmation is cancelled", async () => {
    render(
      <TreatmentManager
        dentistryId="dentistry-1"
        kind="treatment"
        newItem={item}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Delete Check-up" }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Check-up" }));
    expect(
      screen.getByRole("alertdialog", { name: "Delete treatment?" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(unlink).not.toHaveBeenCalled();
    expect(removeTreatment).not.toHaveBeenCalled();
  });

  it("performs the existing two-step transport only after confirmation", async () => {
    render(
      <TreatmentManager
        dentistryId="dentistry-1"
        kind="treatment"
        newItem={item}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Delete Check-up" }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Check-up" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete treatment" }));
    await waitFor(() => expect(unlink).toHaveBeenCalledTimes(1));
    expect(removeTreatment).toHaveBeenCalledTimes(1);
  });

  it("keeps the confirmation open and reports a delete failure", async () => {
    unlink.mockImplementationOnce(() =>
      Promise.resolve({ error: { message: "Delete failed" } }),
    );
    render(
      <TreatmentManager
        dentistryId="dentistry-1"
        kind="treatment"
        newItem={item}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Delete Check-up" }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Check-up" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete treatment" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Delete failed"),
    );
    expect(
      screen.getByRole("alertdialog", { name: "Delete treatment?" }),
    ).toBeTruthy();
    expect(removeTreatment).not.toHaveBeenCalled();
  });

  it("keeps edit values and the description count visible after an update failure", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "Update failed" }), { status: 400 });
    render(
      <TreatmentManager
        dentistryId="dentistry-1"
        kind="treatment"
        newItem={item}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Check-up" })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Check-up" }));
    const description = screen.getByRole("textbox", {
      name: "Treatment description",
    });
    fireEvent.change(description, { target: { value: "Edited details" } });
    fireEvent.click(screen.getByRole("button", { name: "Update treatment" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Update failed"),
    );
    expect(description.value).toBe("Edited details");
    expect(screen.getByText("14/200")).toBeTruthy();
  });
});
