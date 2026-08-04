import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddTreatment from "./AddTreatment";

describe("AddTreatment", () => {
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
});
