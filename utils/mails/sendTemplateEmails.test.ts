import { afterEach, expect, mock, spyOn, test } from "bun:test";

mock.module("server-only", () => ({}));

const originalResendApiKey = process.env.RESEND_API_KEY;

afterEach(() => {
  if (originalResendApiKey === undefined) {
    delete process.env.RESEND_API_KEY;
    return;
  }

  process.env.RESEND_API_KEY = originalResendApiKey;
});

test("loads without a Resend key and preserves the caught send failure", async () => {
  delete process.env.RESEND_API_KEY;
  const consoleLog = spyOn(console, "log").mockImplementation(() => {});

  try {
    const { sendTemplateEmail } = await import("./sendTemplateEmails");

    await expect(
      sendTemplateEmail({
        sendTo: "test@example.com",
        title: "Test email",
        content: "<p>Test</p>",
      }),
    ).resolves.toBeUndefined();
  } finally {
    consoleLog.mockRestore();
  }
});
