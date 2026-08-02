// @ts-nocheck -- Bun provides its test module at runtime without project type declarations.
import React from "react";
import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TREATMENT_DESCRIPTION_MAX_LENGTH } from "@/lib/treatmentDescription";
import LimitedTextArea from "./LimitedTextArea";

afterEach(cleanup);

function renderTreatmentDescription(value: string, onChange = () => {}) {
  return render(
    <LimitedTextArea
      name="description"
      placeholder="Treatment description"
      value={value}
      onChange={onChange}
      limit={TREATMENT_DESCRIPTION_MAX_LENGTH}
      allowOverLimit
    />,
  );
}

describe("treatment description character counter", () => {
  it("shows zero for an empty create form", () => {
    renderTreatmentDescription("");

    expect(screen.getByText(`0/${TREATMENT_DESCRIPTION_MAX_LENGTH}`)).toBeTruthy();
  });

  it("reflects the current controlled input and exposes an over-limit message", () => {
    let currentValue = "";
    const view = renderTreatmentDescription(currentValue, (event) => {
      currentValue = event.target.value;
    });
    const overLimit = "a".repeat(TREATMENT_DESCRIPTION_MAX_LENGTH + 1);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: overLimit } });
    view.rerender(
      <LimitedTextArea
        name="description"
        placeholder="Treatment description"
        value={currentValue}
        onChange={() => {}}
        limit={TREATMENT_DESCRIPTION_MAX_LENGTH}
        allowOverLimit
      />,
    );

    expect(screen.getByText(`${overLimit.length}/${TREATMENT_DESCRIPTION_MAX_LENGTH}`)).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Character limit exceeded by 1");
  });

  it("resets to zero when a successful create clears the controlled value", () => {
    const view = renderTreatmentDescription("Routine check-up");

    view.rerender(
      <LimitedTextArea
        name="description"
        placeholder="Treatment description"
        value=""
        limit={TREATMENT_DESCRIPTION_MAX_LENGTH}
        allowOverLimit
      />,
    );

    expect(screen.getByText(`0/${TREATMENT_DESCRIPTION_MAX_LENGTH}`)).toBeTruthy();
  });

  it("keeps the entered count when a failed submission preserves the value", () => {
    const entered = "Preserved after failure";
    const view = renderTreatmentDescription(entered);

    view.rerender(
      <LimitedTextArea
        name="description"
        placeholder="Treatment description"
        value={entered}
        limit={TREATMENT_DESCRIPTION_MAX_LENGTH}
        allowOverLimit
      />,
    );

    expect(screen.getByText(`${entered.length}/${TREATMENT_DESCRIPTION_MAX_LENGTH}`)).toBeTruthy();
  });

  it("shows the correct initial count for an edit", () => {
    const existing = "Existing treatment description";
    renderTreatmentDescription(existing);

    expect(screen.getByText(`${existing.length}/${TREATMENT_DESCRIPTION_MAX_LENGTH}`)).toBeTruthy();
  });
});
