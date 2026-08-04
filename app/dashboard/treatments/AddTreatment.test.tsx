import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddTreatment from "./AddTreatment";
import { TREATMENT_DESCRIPTION_MAX_LENGTH } from "@/lib/treatmentDescription";

describe("AddTreatment", () => {
  it("keeps the context-specific validation message and legacy title capitalization", async () => {
    const onCreate = mock(async () => ({ ok: true as const, data: {} }));
    render(<AddTreatment onCreate={onCreate} />);
    fireEvent.click(screen.getByRole("button", { name: "Add treatment" }));
    await waitFor(() =>
      expect(screen.getByText("Treatment title is required")).toBeTruthy(),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Treatment title" }), {
      target: { value: "check-up" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Treatment description" }),
      { target: { value: "Routine" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Add treatment" }));
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        title: "Check-Up",
        description: "Routine",
        kind: "treatment",
      }),
    );
  });

  it("preserves draft fields on Action failure and resets only after success", async () => {
    const onCreate = mock(async () => ({
      ok: false as const,
      code: "CREATE_FAILED",
      formError: "Request failed",
    }));
    render(<AddTreatment onCreate={onCreate} />);
    const title = screen.getByRole("textbox", { name: "Treatment title" });
    const description = screen.getByRole("textbox", {
      name: "Treatment description",
    });
    fireEvent.change(title, { target: { value: "Check-up" } });
    fireEvent.change(description, { target: { value: "Routine" } });
    fireEvent.click(screen.getByRole("button", { name: "Add treatment" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Request failed"),
    );
    expect((title as HTMLInputElement).value).toBe("Check-up");
    onCreate.mockResolvedValueOnce({ ok: true, data: {} } as never);
    fireEvent.click(screen.getByRole("button", { name: "Add treatment" }));
    await waitFor(() => expect((title as HTMLInputElement).value).toBe(""));
  });

  it("reports the exact dynamic over-limit message", () => {
    render(
      <AddTreatment
        onCreate={mock(async () => ({ ok: true as const, data: {} }))}
      />,
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Treatment description" }),
      { target: { value: "x".repeat(TREATMENT_DESCRIPTION_MAX_LENGTH + 1) } },
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Character limit exceeded by 1",
    );
  });
});
