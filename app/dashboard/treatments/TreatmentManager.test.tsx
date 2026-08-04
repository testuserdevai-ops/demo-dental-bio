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
});
