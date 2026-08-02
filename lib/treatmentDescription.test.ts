// @ts-nocheck -- Bun provides this test module at runtime without project type declarations.
import { describe, expect, it } from "bun:test";
import {
  EMPTY_TREATMENT_DESCRIPTION,
  TREATMENT_DESCRIPTION_MAX_LENGTH,
  treatmentDescriptionCount,
  treatmentDescriptionReducer,
} from "./treatmentDescription";
import { treatmentSchema } from "./validation";

describe("treatment description validation", () => {
  it("rejects an empty description", () => {
    expect(treatmentSchema.safeParse({ title: "Check-up", description: "" }).success).toBe(false);
  });

  it("accepts a normal description", () => {
    expect(treatmentSchema.safeParse({ title: "Check-up", description: "A routine dental check-up." }).success).toBe(true);
  });

  it("accepts an exact-limit description", () => {
    const description = "a".repeat(TREATMENT_DESCRIPTION_MAX_LENGTH);

    expect(treatmentSchema.safeParse({ title: "Check-up", description }).success).toBe(true);
    expect(treatmentDescriptionCount(description)).toBe(TREATMENT_DESCRIPTION_MAX_LENGTH);
  });

  it("rejects an over-limit description with the configured maximum", () => {
    const result = treatmentSchema.safeParse({
      title: "Check-up",
      description: "a".repeat(TREATMENT_DESCRIPTION_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        `Description must be ${TREATMENT_DESCRIPTION_MAX_LENGTH} characters or less`,
      );
    }
  });
});

describe("treatment description form state", () => {
  it("resets after a successful submission", () => {
    const entered = treatmentDescriptionReducer(EMPTY_TREATMENT_DESCRIPTION, {
      type: "change",
      value: "Whitening treatment",
    });

    expect(treatmentDescriptionReducer(entered, { type: "submissionSucceeded" })).toEqual({ value: "" });
    expect(treatmentDescriptionCount("")).toBe(0);
  });

  it("preserves text and count after a failed submission", () => {
    const entered = { value: "Whitening treatment" };
    const failed = treatmentDescriptionReducer(entered, { type: "submissionFailed" });

    expect(failed).toBe(entered);
    expect(treatmentDescriptionCount(failed.value)).toBe(19);
  });

  it("uses an existing description and count when editing", () => {
    const editing = treatmentDescriptionReducer(EMPTY_TREATMENT_DESCRIPTION, {
      type: "editStarted",
      value: "Existing treatment details",
    });

    expect(editing.value).toBe("Existing treatment details");
    expect(treatmentDescriptionCount(editing.value)).toBe(26);
  });
});
