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
import { PreviewProvider } from "@/app/contexts/PreviewContext";
import { TREATMENT_DESCRIPTION_MAX_LENGTH } from "@/lib/treatmentDescription";
import AddTreatment from "./AddTreatment";

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

function renderForm() {
  return render(
    <PreviewProvider>
      <AddTreatment dentistryId="dentistry-1" />
    </PreviewProvider>,
  );
}

describe("AddTreatment", () => {
  it("shows the live description count and resets fields only after a successful create", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          treatment_id: "one",
          title: "Check-up",
          description: "Routine",
          rank: 1,
        }),
        { status: 201 },
      );
    renderForm();
    const title = screen.getByRole("textbox", { name: "Treatment title" });
    const description = screen.getByRole("textbox", {
      name: "Treatment description",
    });

    fireEvent.change(title, { target: { value: "check-up" } });
    fireEvent.change(description, { target: { value: "Routine" } });
    expect(
      screen.getByText(`7/${TREATMENT_DESCRIPTION_MAX_LENGTH}`),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add treatment" }));

    await waitFor(() => expect(title.value).toBe(""));
    expect(description.value).toBe("");
    expect(
      screen.getByText(`0/${TREATMENT_DESCRIPTION_MAX_LENGTH}`),
    ).toBeTruthy();
  });

  it("preserves entered values after a failed create", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "Request failed" }), {
        status: 400,
      });
    renderForm();
    const title = screen.getByRole("textbox", { name: "Treatment title" });
    const description = screen.getByRole("textbox", {
      name: "Treatment description",
    });

    fireEvent.change(title, { target: { value: "Check-up" } });
    fireEvent.change(description, {
      target: { value: "Preserved after failure" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add treatment" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Request failed"),
    );
    expect(title.value).toBe("Check-up");
    expect(description.value).toBe("Preserved after failure");
  });

  it("shows the exact over-limit counter and prevents a create request", async () => {
    const request = mock(() =>
      Promise.resolve(new Response("{}", { status: 201 })),
    );
    globalThis.fetch = request;
    renderForm();
    const description = screen.getByRole("textbox", {
      name: "Treatment description",
    });
    const overLimit = "a".repeat(TREATMENT_DESCRIPTION_MAX_LENGTH + 1);

    fireEvent.change(description, { target: { value: overLimit } });
    expect(
      screen.getByText(
        `${overLimit.length}/${TREATMENT_DESCRIPTION_MAX_LENGTH}`,
      ),
    ).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Character limit exceeded by 1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Add treatment" }));
    await waitFor(() =>
      expect(screen.getByText("Treatment title is required")).toBeTruthy(),
    );
    expect(request).not.toHaveBeenCalled();
  });
});
