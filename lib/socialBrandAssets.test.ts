import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("social brand assets", () => {
  test("keeps the Messenger logo background transparent", () => {
    const png = readFileSync("public/brand/social/messenger.png");

    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png[25]).toBe(6); // PNG color type 6 is truecolor with alpha.
  });
});
