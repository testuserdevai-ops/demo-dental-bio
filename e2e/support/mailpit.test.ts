import { describe, expect, it } from "bun:test";
import { extractSixDigitCode } from "./mailpit";

describe("Mailpit helpers", () => {
  it("extracts an isolated six-digit account code", () => {
    expect(extractSixDigitCode("Alternatively, enter the code: 341306")).toBe(
      "341306",
    );
    expect(extractSixDigitCode("reference 1234567")).toBeUndefined();
  });
});
