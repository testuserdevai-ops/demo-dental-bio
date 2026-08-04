import { beforeEach, expect, mock, spyOn, test } from "bun:test";

import type { DomainConfig } from "@/utils/domainConfig";

mock.module("server-only", () => ({}));

type ResendResult = {
  data: { id: string } | null;
  error: {
    message: string;
    name: string;
    statusCode: number;
  } | null;
};

const sendEmail = mock(async (): Promise<ResendResult> => ({
  data: null,
  error: null,
}));

const domainConfig: DomainConfig = {
  domain: "dental.test",
  brandName: "Dentalbio",
  vertical: "dental",
  logoPath: "/logo.svg",
  heroImage: "/hero.webp",
  menuImage: "/menu.webp",
  emailFrom: "Biocloud",
  supportEmail: "Support",
  contactEmail: "support@example.test",
  baseUrl: "https://dental.test",
  positions: ["Dentist"],
};

mock.module("@/utils/mails/resendClient", () => ({
  getResendClient: () => ({ emails: { send: sendEmail } }),
}));
mock.module("@/utils/domainConfig", () => ({
  EMAIL_CONFIG: {
    from: "noreply@dental.test",
    support: "support@dental.test",
    contact: "hello@dental.test",
  },
  getDomainConfig: () => domainConfig,
  getDomainConfigByHostname: () => domainConfig,
}));
mock.module("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
  headers: async () => new Headers({ host: "dental.test" }),
}));

const { POST } = await import("./route");
const { sendVerificationMail } =
  await import("@/utils/mails/sendVerificationMail");
const { sendTemplateEmail } = await import("@/utils/mails/sendTemplateEmails");

function webhookRequest() {
  return new Request("https://dental.test/api/webhooks/verification-changed", {
    method: "POST",
    headers: {
      authorization: "Bearer local-verification-secret",
    },
    body: JSON.stringify({
      id: "00000000-0000-4000-8000-000000000001",
      email: "owner@example.test",
      username: "owner",
      first_name: "Owner",
      isVerified: true,
      timestamp: "2026-08-04T04:50:09.000Z",
    }),
  });
}

beforeEach(() => {
  process.env.CRON_SECRET_KEY = "local-verification-secret";
  sendEmail.mockReset();
});

test("resolved provider failure returns 500 without exposing provider details", async () => {
  const providerText = "provider diagnostic should stay private";
  const recipientText = "private-recipient@example.test";
  const secretText = "private-provider-secret";
  const consoleError = spyOn(console, "error").mockImplementation(() => {});

  sendEmail.mockResolvedValueOnce({
    data: null,
    error: {
      message: `${providerText} ${recipientText} ${secretText}`,
      name: "validation_error",
      statusCode: 422,
    },
  });

  try {
    const response = await POST(webhookRequest());
    const responseText = await response.text();

    expect(response.status).toBe(500);
    expect(sendEmail).toHaveBeenCalledTimes(1);

    expect(consoleError.mock.calls.length).toBe(1);
    expect(consoleError.mock.calls[0]?.length).toBe(1);
    const loggedText = consoleError.mock.calls.flat().map(String).join(" ");
    expect(loggedText.includes(providerText)).toBe(false);
    expect(loggedText.includes(recipientText)).toBe(false);
    expect(loggedText.includes(secretText)).toBe(false);
    expect(responseText.includes(providerText)).toBe(false);
    expect(responseText.includes(recipientText)).toBe(false);
    expect(responseText.includes(secretText)).toBe(false);
  } finally {
    consoleError.mockRestore();
  }
});

test("resolved missing delivery data is recorded for explicit operational replay", async () => {
  const consoleError = spyOn(console, "error").mockImplementation(() => {});
  sendEmail.mockResolvedValueOnce({ data: null, error: null });

  try {
    expect((await POST(webhookRequest())).status).toBe(500);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  } finally {
    consoleError.mockRestore();
  }
});

test("resolved provider details become a sanitized verification failure", async () => {
  sendEmail.mockResolvedValueOnce({
    data: null,
    error: {
      message: "provider recipient secret diagnostics",
      name: "validation_error",
      statusCode: 422,
    },
  });

  await expect(
    sendVerificationMail("owner@example.test", "owner", "Owner", domainConfig),
  ).rejects.toThrow("Email delivery failed");
});

test("resolved delivery data completes the verification webhook", async () => {
  sendEmail.mockResolvedValueOnce({
    data: { id: "email-delivery-id" },
    error: null,
  });

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

test("legacy non-opt-in callers retain resolved provider-error semantics", async () => {
  sendEmail.mockResolvedValueOnce({
    data: null,
    error: {
      message: "legacy provider failure",
      name: "validation_error",
      statusCode: 422,
    },
  });

  await expect(
    sendTemplateEmail(
      {
        sendTo: "legacy@example.test",
        title: "Legacy email",
        content: "<p>Legacy</p>",
      },
      domainConfig,
    ),
  ).resolves.toBeNull();
});
