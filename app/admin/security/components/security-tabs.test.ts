import { describe, expect, test } from "bun:test";
import { getNextSecurityTabIndex } from "./security-tabs";

describe("security dashboard tab keyboard navigation", () => {
  test("supports arrows with wrapping plus Home and End", () => {
    expect(getNextSecurityTabIndex(0, "ArrowRight", 7)).toBe(1);
    expect(getNextSecurityTabIndex(6, "ArrowRight", 7)).toBe(0);
    expect(getNextSecurityTabIndex(0, "ArrowLeft", 7)).toBe(6);
    expect(getNextSecurityTabIndex(3, "Home", 7)).toBe(0);
    expect(getNextSecurityTabIndex(3, "End", 7)).toBe(6);
    expect(getNextSecurityTabIndex(3, "Enter", 7)).toBeNull();
  });
});
