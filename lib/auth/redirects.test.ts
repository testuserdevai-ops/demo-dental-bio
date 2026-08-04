import { describe, expect, it } from "bun:test";
import { safeInternalPath } from "./redirects";

describe("safeInternalPath", () => {
  it("preserves normalized internal paths", () => {
    expect(safeInternalPath("/dashboard/settings?tab=account#password")).toBe(
      "/dashboard/settings?tab=account#password",
    );
  });

  it("rejects external, protocol-relative, encoded, and malformed paths", () => {
    for (const unsafe of [
      "https://evil.example",
      "//evil.example/path",
      "/%2f%2fevil.example",
      "/\\evil.example",
      "dashboard",
      "/bad\npath",
    ]) {
      expect(safeInternalPath(unsafe)).toBe("/dashboard");
    }
  });
});
