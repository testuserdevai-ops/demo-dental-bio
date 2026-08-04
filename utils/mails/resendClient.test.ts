import { afterEach, expect, mock, test } from "bun:test";

const constructedWith: string[] = [];

class FakeResend {
  constructor(apiKey: string) {
    constructedWith.push(apiKey);
  }
}

mock.module("server-only", () => ({}));
mock.module("resend", () => ({ Resend: FakeResend }));

const originalResendApiKey = process.env.RESEND_API_KEY;

afterEach(() => {
  constructedWith.length = 0;

  if (originalResendApiKey === undefined) {
    delete process.env.RESEND_API_KEY;
    return;
  }

  process.env.RESEND_API_KEY = originalResendApiKey;
});

test("constructs no client on import and caches one client per current API key", async () => {
  delete process.env.RESEND_API_KEY;

  const { getResendClient } = await import("./resendClient");
  expect(constructedWith).toEqual([]);

  process.env.RESEND_API_KEY = "first-key";
  const firstClient = getResendClient();
  expect(getResendClient()).toBe(firstClient);
  expect(constructedWith).toEqual(["first-key"]);

  process.env.RESEND_API_KEY = "rotated-key";
  const rotatedClient = getResendClient();
  expect(rotatedClient).not.toBe(firstClient);
  expect(getResendClient()).toBe(rotatedClient);
  expect(constructedWith).toEqual(["first-key", "rotated-key"]);
});
