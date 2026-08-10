import { describe, expect, it } from "bun:test";
import { verificationSessionResponseSchema } from "./schemas";

describe("verification provider response", () => {
  it("accepts only a bounded HTTPS session response", () => {
    expect(
      verificationSessionResponseSchema.safeParse({
        verification: { id: "session-1", url: "https://verify.example/start" },
        redirectOrigin: "https://verify.example",
      }).success,
    ).toBe(true);
    expect(
      verificationSessionResponseSchema.safeParse({
        verification: { id: "session-1", url: "javascript:alert(1)" },
        redirectOrigin: "https://verify.example",
      }).success,
    ).toBe(false);
    expect(
      verificationSessionResponseSchema.safeParse({
        verification: { url: "https://verify.example/start" },
        redirectOrigin: "https://verify.example",
      }).success,
    ).toBe(false);
    expect(
      verificationSessionResponseSchema.safeParse({
        verification: {
          id: "session-1",
          url: "https://attacker.example/start",
        },
        redirectOrigin: "https://verify.example",
      }).success,
    ).toBe(false);
  });
});
