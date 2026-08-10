import { describe, expect, it } from "bun:test";
import { referralInviteSchema } from "./schemas";

describe("referralInviteSchema", () => {
  it("normalizes the invitee email", () => {
    expect(
      referralInviteSchema.parse({ email: "  FRIEND@EXAMPLE.COM " }),
    ).toEqual({ email: "friend@example.com" });
  });

  it("rejects invalid email and caller-controlled sender data", () => {
    expect(referralInviteSchema.safeParse({ email: "invalid" }).success).toBe(
      false,
    );
    expect(
      referralInviteSchema.safeParse({
        email: "friend@example.com",
        name: "Forged",
        referralLink: "https://evil.example",
        userId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
});
