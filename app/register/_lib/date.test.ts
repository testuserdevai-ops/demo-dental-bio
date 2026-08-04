import { describe, expect, it } from "bun:test";

import { normalizeBirthday } from "./date";

describe("normalizeBirthday", () => {
  it("normalizes a pasted date into the registration DD/MM/YYYY contract", () => {
    expect(normalizeBirthday("1990-02-03")).toBe("03/02/1990");
  });

  it("rejects impossible, future, and underage dates", () => {
    expect(normalizeBirthday("31/02/1990")).toBeNull();
    expect(normalizeBirthday("01/01/2999")).toBeNull();
    expect(normalizeBirthday("01/01/2020")).toBeNull();
  });
});
