import { afterEach, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const originalResendApiKey = process.env.RESEND_API_KEY;

afterEach(() => {
  if (originalResendApiKey === undefined) {
    delete process.env.RESEND_API_KEY;
    return;
  }

  process.env.RESEND_API_KEY = originalResendApiKey;
});

test("loads without a Resend key and rejects an attempted send explicitly", async () => {
  delete process.env.RESEND_API_KEY;

  const { sendTemplateEmail } = await import("./sendTemplateEmails");

  await expect(
    sendTemplateEmail({
      sendTo: "test@example.com",
      title: "Test email",
      content: "<p>Test</p>",
    }),
  ).rejects.toThrow(
    "Email delivery is not configured. Set RESEND_API_KEY before sending email.",
  );
});
