import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SectionTitleForm from "./SectionTitleForm";

const titles = {
  treatmentSectionTitle: "Treatments",
  serviceSectionTitle: "Services",
};

describe("SectionTitleForm", () => {
  it("retains drafts and skips preview reload when a save fails", async () => {
    const onSaved = mock(() => undefined);
    render(
      <SectionTitleForm
        titles={titles}
        onSave={mock(async () => ({
          ok: false as const,
          code: "UPDATE_FAILED",
          formError: "Save failed",
        }))}
        onSaved={onSaved}
      />,
    );

    const treatmentTitle = screen.getByRole("textbox", {
      name: "Treatment section title",
    });
    fireEvent.change(treatmentTitle, { target: { value: "Smile treatments" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Save section titles" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Save failed"),
    );
    expect((treatmentTitle as HTMLInputElement).value).toBe("Smile treatments");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows pending and success states and reloads preview exactly once", async () => {
    let resolveSave: (
      value: Awaited<
        ReturnType<Parameters<typeof SectionTitleForm>[0]["onSave"]>
      >,
    ) => void = () => undefined;
    const onSave = mock(
      () =>
        new Promise<
          Awaited<ReturnType<Parameters<typeof SectionTitleForm>[0]["onSave"]>>
        >((resolve) => {
          resolveSave = resolve;
        }),
    );
    const onSaved = mock(() => undefined);
    render(
      <SectionTitleForm titles={titles} onSave={onSave} onSaved={onSaved} />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Service section title" }),
      { target: { value: "Patient services" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Save section titles" }),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Save section titles",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true),
    );

    resolveSave({
      ok: true,
      data: {
        treatmentSectionTitle: "Treatments",
        serviceSectionTitle: "Patient services",
      },
    });
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "Section titles saved",
      ),
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
