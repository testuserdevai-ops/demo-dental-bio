import { describe, expect, it } from "bun:test";
import { offerCodeSchema } from "./offer-code-schema";

describe("offerCodeSchema", () => {
  it("trims and accepts a complete offer code", () => {
    expect(
      offerCodeSchema.parse({
        university: "  King's College London ",
        offer_code: "  KCL2026 ",
      }),
    ).toEqual({ university: "King's College London", offer_code: "KCL2026" });
  });

  it("requires both values", () => {
    expect(
      offerCodeSchema.safeParse({ university: "", offer_code: "" }).success,
    ).toBe(false);
  });
});
