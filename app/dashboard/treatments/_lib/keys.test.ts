import { describe, expect, it } from "bun:test";
import { treatmentKeys } from "./keys";

describe("treatment query keys", () => {
  it("uses only the controlled prefix and immutable scope ID", () => {
    expect(
      treatmentKeys.aggregate("00000000-0000-4000-8000-000000000001"),
    ).toEqual([
      "dashboard",
      "treatments",
      "00000000-0000-4000-8000-000000000001",
    ]);
  });
});
