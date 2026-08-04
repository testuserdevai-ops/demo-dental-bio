import { afterEach, expect, test } from "bun:test";
import { getDomainConfigByHostname } from "@/utils/domainConfig";

const originalResendApiKey = process.env.RESEND_API_KEY;

afterEach(() => {
  if (originalResendApiKey === undefined) {
    delete process.env.RESEND_API_KEY;
    return;
  }

  process.env.RESEND_API_KEY = originalResendApiKey;
});

test("the API send route imports without a key and returns its controlled failure response", async () => {
  delete process.env.RESEND_API_KEY;

  const { POST } = await import("@/app/api/send/route");
  const response = await POST(
    new Request("https://example.com/api/send", { method: "POST" }),
  );

  expect(response.status).toBe(500);
  await expect(response.json()).resolves.toEqual({
    error: "Internal server error",
  });
});

test("reporting sends preserve their caught missing-configuration failure", async () => {
  delete process.env.RESEND_API_KEY;

  const { sendTrialStatusEmail } = await import("./sendReportEmail");

  await expect(sendTrialStatusEmail([])).resolves.toBeUndefined();
});

test("marketing sends return failed recipients when email delivery is unconfigured", async () => {
  delete process.env.RESEND_API_KEY;

  const { sendMarketingEmail } = await import("./sendMarketingEmail");
  const result = await sendMarketingEmail({
    subject: "Test campaign",
    bodyHtml: "<p>Test</p>",
    config: getDomainConfigByHostname("biocloud"),
    recipients: [{ email: "test@example.com" }],
  });

  expect(result).toEqual({
    sent: 0,
    failed: 1,
    errors: [
      "Email delivery is not configured. Set RESEND_API_KEY before sending email.",
    ],
  });
});
