import { describe, expect, it } from "bun:test";
import { isValidProrationAmount } from "./PricingTable";

describe("PricingTable proration guard", () => {
  it("accepts finite numeric proration amounts, including a zero charge", () => {
    expect(isValidProrationAmount(0)).toBe(true);
    expect(isValidProrationAmount(12.5)).toBe(true);
    expect(isValidProrationAmount(-3)).toBe(true);
  });

  it("rejects malformed amounts before they can enable a plan update", () => {
    expect(isValidProrationAmount("12.5")).toBe(false);
    expect(isValidProrationAmount(null)).toBe(false);
    expect(isValidProrationAmount(Number.NaN)).toBe(false);
    expect(isValidProrationAmount(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
