import { describe, expect, it } from "bun:test";
import {
  birthdaySchema,
  loginSchema,
  otpSchema,
  passwordSchema,
  usernameSchema,
} from "./schemas";

describe("account-entry schemas", () => {
  it("normalizes the proven username character set", () => {
    expect(usernameSchema.parse("  Dr.Jane_Doe  ")).toBe("dr.jane_doe");
    expect(usernameSchema.safeParse("two words").success).toBe(false);
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });

  it("normalizes login email without weakening password presence", () => {
    expect(
      loginSchema.parse({ email: "  OWNER@EXAMPLE.COM ", password: "secret" }),
    ).toMatchObject({ email: "owner@example.com", password: "secret" });
    expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(
      false,
    );
  });

  it("rejects invalid, future, and underage birthdays", () => {
    expect(birthdaySchema.safeParse("31/02/1990").success).toBe(false);
    expect(birthdaySchema.safeParse("01/01/2999").success).toBe(false);
    expect(birthdaySchema.safeParse("01/01/1990").success).toBe(true);
  });

  it("keeps password and OTP requirements authoritative", () => {
    expect(passwordSchema.safeParse("GoodPass1!").success).toBe(true);
    expect(passwordSchema.safeParse("weak").success).toBe(false);
    expect(
      otpSchema.safeParse({ email: "a@b.com", otp: "123456" }).success,
    ).toBe(true);
    expect(
      otpSchema.safeParse({ email: "a@b.com", otp: "12ab56" }).success,
    ).toBe(false);
  });
});
