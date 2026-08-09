import { describe, expect, test } from "bun:test";
import {
  blockedDomainFormSchema,
  blockedFingerprintFormSchema,
  blockedIpFormSchema,
} from "./block-list-schema";

describe("security block-list form schemas", () => {
  test("trims accepted values before a mutation request", () => {
    expect(
      blockedIpFormSchema.parse({ ip: " 127.0.0.1 ", reason: " note " }),
    ).toEqual({ ip: "127.0.0.1", reason: "note" });
    expect(
      blockedFingerprintFormSchema.parse({
        fingerprint: " device ",
        reason: "",
      }),
    ).toEqual({ fingerprint: "device", reason: "" });
    expect(blockedDomainFormSchema.parse({ domain: " example.com " })).toEqual({
      domain: "example.com",
    });
  });

  test("rejects blank and unbounded mutation inputs", () => {
    expect(blockedIpFormSchema.safeParse({ ip: " ", reason: "" }).success).toBe(
      false,
    );
    expect(
      blockedFingerprintFormSchema.safeParse({
        fingerprint: " ",
        reason: "",
      }).success,
    ).toBe(false);
    expect(blockedDomainFormSchema.safeParse({ domain: " " }).success).toBe(
      false,
    );
    expect(
      blockedIpFormSchema.safeParse({
        ip: "127.0.0.1",
        reason: "x".repeat(513),
      }).success,
    ).toBe(false);
  });
});
