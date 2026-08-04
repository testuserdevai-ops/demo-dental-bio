import { describe, expect, test } from "bun:test";
import { getCurrentHostname } from "./domainConfig";

describe("request hostname resolution", () => {
  test("prefers the forwarded public host over the internal server host", () => {
    const headers = new Headers({
      host: "localhost:3000",
      "x-forwarded-host": "profile.example.test",
    });

    expect(getCurrentHostname(headers)).toBe("profile.example.test");
  });

  test("falls back to host and removes its port", () => {
    expect(getCurrentHostname(new Headers({ host: "localhost:3000" }))).toBe(
      "localhost",
    );
  });
});
