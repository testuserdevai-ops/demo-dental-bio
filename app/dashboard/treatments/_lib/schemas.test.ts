import { describe, expect, it } from "bun:test";
import {
  createTreatmentInputSchema,
  deleteTreatmentInputSchema,
  reorderTreatmentsInputSchema,
  updateTreatmentInputSchema,
} from "./schemas";

const id = "00000000-0000-4000-8000-000000000001";

describe("treatment action schemas", () => {
  it("accepts only controlled create fields", () => {
    expect(
      createTreatmentInputSchema.safeParse({
        title: "Check-up",
        description: "Routine care",
        kind: "treatment",
      }).success,
    ).toBe(true);
    expect(
      createTreatmentInputSchema.safeParse({
        title: "Check-up",
        description: "Routine care",
        kind: "treatment",
        dentistryId: id,
      }).success,
    ).toBe(false);
  });

  it("accepts an entity ID only where the action needs one", () => {
    expect(
      updateTreatmentInputSchema.safeParse({
        treatmentId: id,
        title: "Check-up",
        description: "Routine care",
        kind: "service",
      }).success,
    ).toBe(true);
    expect(
      deleteTreatmentInputSchema.safeParse({ treatmentId: id }).success,
    ).toBe(true);
    expect(
      updateTreatmentInputSchema.safeParse({
        treatmentId: id,
        title: "Check-up",
        description: "Routine care",
        kind: "service",
        userId: id,
        rank: 1,
        isAdmin: true,
        owner: id,
      }).success,
    ).toBe(false);
  });

  it("requires a nonempty unique UUID reorder list", () => {
    expect(
      reorderTreatmentsInputSchema.safeParse({ orderedIds: [id] }).success,
    ).toBe(true);
    expect(
      reorderTreatmentsInputSchema.safeParse({ orderedIds: [] }).success,
    ).toBe(false);
    expect(
      reorderTreatmentsInputSchema.safeParse({ orderedIds: [id, id] }).success,
    ).toBe(false);
  });
});
