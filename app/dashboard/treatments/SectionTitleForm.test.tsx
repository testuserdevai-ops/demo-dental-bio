import React from "react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import SectionTitleForm from "./SectionTitleForm";

const titles = {
  treatmentSectionTitle: "Treatments",
  serviceSectionTitle: "Services",
};

afterEach(cleanup);

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

    act(() => {
      resolveSave({
        ok: true,
        data: {
          treatmentSectionTitle: "Treatments",
          serviceSectionTitle: "Patient services",
        },
      });
    });
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "Section titles saved",
      ),
    );
    expect(onSaved).toHaveBeenCalledTimes(1);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Service section title" }),
      { target: { value: "Edited after save" } },
    );
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  it("turns a rejected save transport into an explicit error without losing the draft", async () => {
    const onSaved = mock(() => undefined);
    render(
      <SectionTitleForm
        titles={titles}
        onSave={mock(async () => {
          throw new Error("transport unavailable");
        })}
        onSaved={onSaved}
      />,
    );

    const treatmentTitle = screen.getByRole("textbox", {
      name: "Treatment section title",
    });
    fireEvent.change(treatmentTitle, {
      target: { value: "Draft treatment title" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save section titles" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not save treatment and service section titles",
      ),
    );
    expect((treatmentTitle as HTMLInputElement).value).toBe(
      "Draft treatment title",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("reconciles changed authoritative titles while pristine but preserves a dirty draft", async () => {
    const onSave = mock(async () => ({
      ok: true as const,
      data: titles,
    }));
    const onSaved = mock(() => undefined);
    const view = render(
      <SectionTitleForm titles={titles} onSave={onSave} onSaved={onSaved} />,
    );

    view.rerender(
      <SectionTitleForm
        titles={{
          treatmentSectionTitle: "Authoritative treatments",
          serviceSectionTitle: "Authoritative services",
        }}
        onSave={onSave}
        onSaved={onSaved}
      />,
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: "Treatment section title",
          }) as HTMLInputElement
        ).value,
      ).toBe("Authoritative treatments"),
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Treatment section title" }),
      { target: { value: "Unsaved local draft" } },
    );
    view.rerender(
      <SectionTitleForm
        titles={{
          treatmentSectionTitle: "New server treatments",
          serviceSectionTitle: "New server services",
        }}
        onSave={onSave}
        onSaved={onSaved}
      />,
    );
    expect(
      (
        screen.getByRole("textbox", {
          name: "Treatment section title",
        }) as HTMLInputElement
      ).value,
    ).toBe("Unsaved local draft");

    fireEvent.change(
      screen.getByRole("textbox", { name: "Treatment section title" }),
      { target: { value: "Authoritative treatments" } },
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: "Treatment section title",
          }) as HTMLInputElement
        ).value,
      ).toBe("New server treatments"),
    );
    expect(
      (
        screen.getByRole("textbox", {
          name: "Service section title",
        }) as HTMLInputElement
      ).value,
    ).toBe("New server services");
  });

  it("clears stale save feedback when authoritative titles are reconciled", async () => {
    const onSaved = mock(() => undefined);
    const view = render(
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

    fireEvent.click(
      screen.getByRole("button", { name: "Save section titles" }),
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());

    view.rerender(
      <SectionTitleForm
        titles={{
          treatmentSectionTitle: "Authoritative treatments",
          serviceSectionTitle: "Authoritative services",
        }}
        onSave={mock(async () => ({ ok: true as const, data: titles }))}
        onSaved={onSaved}
      />,
    );

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(
      (
        screen.getByRole("textbox", {
          name: "Treatment section title",
        }) as HTMLInputElement
      ).value,
    ).toBe("Authoritative treatments");
  });

  it("clears a success message when newer authoritative titles are reconciled", async () => {
    const onSaved = mock(() => undefined);
    const onSave = mock(async () => ({ ok: true as const, data: titles }));
    const view = render(
      <SectionTitleForm titles={titles} onSave={onSave} onSaved={onSaved} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Save section titles" }),
    );
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());

    view.rerender(
      <SectionTitleForm
        titles={{
          treatmentSectionTitle: "Authoritative treatments",
          serviceSectionTitle: "Authoritative services",
        }}
        onSave={onSave}
        onSaved={onSaved}
      />,
    );

    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });
});
