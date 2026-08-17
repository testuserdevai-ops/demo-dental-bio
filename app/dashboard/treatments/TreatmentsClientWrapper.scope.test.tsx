import React from "react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import type { TreatmentServiceSectionTitlesInput } from "./_lib/schemas";
import ScopedSectionTitleForm from "./ScopedSectionTitleForm";

const save = mock(
  async ({
    input,
    scopeId,
    targetHint,
  }: {
    input: TreatmentServiceSectionTitlesInput;
    scopeId: string;
    targetHint: string;
  }) => ({ ok: true as const, data: input, scopeId, targetHint }),
);

function AdminTargetEditor({
  scopeId,
  targetHint,
  titles,
}: {
  scopeId: string;
  targetHint: string;
  titles: TreatmentServiceSectionTitlesInput;
}) {
  return (
    <ScopedSectionTitleForm
      onSave={(input) => save({ input, scopeId, targetHint })}
      onSaved={() => undefined}
      scopeId={scopeId}
      titles={titles}
    />
  );
}

afterEach(() => {
  cleanup();
  save.mockClear();
});

describe("TreatmentsClientWrapper scope reconciliation", () => {
  it("remounts the editor on an admin target switch so values and mutation scope stay aligned", async () => {
    const view = render(
      <AdminTargetEditor
        scopeId="00000000-0000-4000-8000-000000000001"
        targetHint="00000000-0000-4000-8000-000000000001"
        titles={{
          treatmentSectionTitle: "Owner A treatments",
          serviceSectionTitle: "Owner A services",
        }}
      />,
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Treatment section title" }),
      { target: { value: "Owner A stale draft" } },
    );

    view.rerender(
      <AdminTargetEditor
        scopeId="00000000-0000-4000-8000-000000000002"
        targetHint="00000000-0000-4000-8000-000000000002"
        titles={{
          treatmentSectionTitle: "Owner B treatments",
          serviceSectionTitle: "Owner B services",
        }}
      />,
    );

    expect(
      (
        screen.getByRole("textbox", {
          name: "Treatment section title",
        }) as HTMLInputElement
      ).value,
    ).toBe("Owner B treatments");
    expect(
      (
        screen.getByRole("textbox", {
          name: "Service section title",
        }) as HTMLInputElement
      ).value,
    ).toBe("Owner B services");

    fireEvent.click(
      screen.getByRole("button", { name: "Save section titles" }),
    );
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith({
      input: {
        treatmentSectionTitle: "Owner B treatments",
        serviceSectionTitle: "Owner B services",
      },
      scopeId: "00000000-0000-4000-8000-000000000002",
      targetHint: "00000000-0000-4000-8000-000000000002",
    });
  });
});
