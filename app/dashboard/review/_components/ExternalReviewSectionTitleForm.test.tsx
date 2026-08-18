import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import ExternalReviewSectionTitleForm from "./ExternalReviewSectionTitleForm";

afterEach(cleanup);

describe("ExternalReviewSectionTitleForm", () => {
  it("normalizes the authoritative result and reloads the preview exactly once", async () => {
    const onSave = mock(async () => ({
      ok: true as const,
      data: { externalReviewSectionTitle: "More owner reviews" },
    }));
    const onSaved = mock(() => {});
    render(
      <ExternalReviewSectionTitleForm
        enabled
        onSave={onSave}
        onSaved={onSaved}
        title={null}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "External review section title" }),
      { target: { value: "  More owner reviews  " } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Save external review heading" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      externalReviewSectionTitle: "More owner reviews",
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(
      (
        screen.getByRole("textbox", {
          name: "External review section title",
        }) as HTMLInputElement
      ).value,
    ).toBe("More owner reviews");
    expect(screen.getByRole("status").textContent).toContain("saved");
  });

  it("retains the draft and does not reload after a returned failure", async () => {
    const onSave = mock(async () => ({
      ok: false as const,
      code: "UPDATE_FAILED",
      formError: "Heading was not saved",
    }));
    const onSaved = mock(() => {});
    render(
      <ExternalReviewSectionTitleForm
        enabled
        onSave={onSave}
        onSaved={onSaved}
        title="Existing heading"
      />,
    );

    const input = screen.getByRole("textbox", {
      name: "External review section title",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Unsaved owner draft" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Save external review heading" }),
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(input.value).toBe("Unsaved owner draft");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("retains the draft and does not reload when the mutation rejects", async () => {
    const onSave = mock(async () => {
      throw new Error("network unavailable");
    });
    const onSaved = mock(() => {});
    render(
      <ExternalReviewSectionTitleForm
        enabled
        onSave={onSave}
        onSaved={onSaved}
        title="Existing heading"
      />,
    );

    const input = screen.getByRole("textbox", {
      name: "External review section title",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Rejected owner draft" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Save external review heading" }),
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(input.value).toBe("Rejected owner draft");
    expect(onSaved).not.toHaveBeenCalled();
  });
});
