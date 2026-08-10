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

const sendEmail = mock(async (_payload?: unknown): Promise<ResendResult> => ({
  data: { id: "email-delivery-id" },
  error: null,
}));
const getResendClient = mock(() => ({ emails: { send: sendEmail } }));
const getUser = mock(async () => ({
  data: {
    first_name: "Owner",
    last_name: "Example",
    username: "owner",
  },
  error: null,
}));
const createClient = mock(async () => ({
  from: () => ({
    select: () => ({
      eq: () => ({ single: getUser }),
    }),
  }),
}));
const sendUserPlanChangedReportEmail = mock(async () => undefined);

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
  getResendClient,
  sendEmail: (payload: unknown) => getResendClient().emails.send(payload),
}));
mock.module("@/utils/supabase/server", () => ({ createClient }));
mock.module("@/utils/mails/sendReportEmail", () => ({
  sendUserPlanChangedReportEmail,
}));
mock.module("@/lib/dashboard/authority-write", () => ({
  setDentalBrandAuthority: async () => undefined,
}));
mock.module("@/utils/domainConfig", () => ({
  EMAIL_CONFIG: {
    from: "noreply@dental.test",
    support: "support@dental.test",
    contact: "hello@dental.test",
  },
  getDomainConfigByHostname: () => domainConfig,
}));

const { POST } = await import("./route");
const { sendDowngradePlanMail, sendPlanChangeEmail, sendUpgradePlanMail } =
  await import("@/utils/mails/sendTemplateEmails");

function webhookRequest() {
  return new Request("https://dental.test/api/webhooks/user-changed", {
    method: "POST",
    headers: {
      authorization: "Bearer local-user-change-secret",
    },
    body: JSON.stringify({
      record: {
        id: "00000000-0000-4000-8000-000000000001",
        email: "owner@example.test",
        registered_domain: "dental.test",
        subscription_status: "PRO",
        billing_cycle: "monthly",
        use_dental_brand: true,
      },
      old_record: {
        subscription_status: "FREE",
        billing_cycle: "monthly",
      },
    }),
  });
}

beforeEach(() => {
  process.env.WEBHOOK_SECRET = "local-user-change-secret";
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({
    data: { id: "email-delivery-id" },
    error: null,
  });
  getResendClient.mockReset();
  getResendClient.mockImplementation(() => ({
    emails: { send: sendEmail },
  }));
  createClient.mockClear();
  getUser.mockClear();
  sendUserPlanChangedReportEmail.mockClear();
});

async function expectSanitizedPlanFailure() {
  await expect(
    sendPlanChangeEmail(
      "owner@example.test",
      "FREE",
      "monthly",
      "PRO",
      "monthly",
      domainConfig,
      { throwOnError: true },
    ),
  ).rejects.toThrow("Email delivery failed");
}

async function expectOperationalFailure() {
  const consoleError = spyOn(console, "error").mockImplementation(() => {});

  try {
    expect((await POST(webhookRequest())).status).toBe(500);
  } finally {
    consoleError.mockRestore();
  }
}

test("missing mail configuration becomes a sanitized operational failure", async () => {
  getResendClient.mockImplementation(() => {
    throw new Error("missing key with private recipient and secret details");
  });

  await expectSanitizedPlanFailure();
  await expectOperationalFailure();
});

test("thrown provider errors become a sanitized operational failure", async () => {
  sendEmail.mockRejectedValue(
    new Error("provider threw with private recipient and secret details"),
  );

  await expectSanitizedPlanFailure();
  await expectOperationalFailure();
});

test("resolved provider errors become a sanitized operational failure", async () => {
  const providerText = "private provider diagnostic";
  const recipientText = "private-recipient@example.test";
  const secretText = "private-provider-secret";
  sendEmail.mockResolvedValue({
    data: null,
    error: {
      message: `${providerText} ${recipientText} ${secretText}`,
      name: "validation_error",
      statusCode: 422,
    },
  });

  await expectSanitizedPlanFailure();

  const consoleError = spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await POST(webhookRequest());
    const responseText = await response.text();

    expect(response.status).toBe(500);
    expect(consoleError.mock.calls.length).toBe(1);
    expect(consoleError.mock.calls[0]?.length).toBe(1);
    expect(consoleError.mock.calls[0]?.[0]).toBe(
      "User-change webhook processing failed",
    );

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

test("resolved missing delivery data becomes a sanitized operational failure", async () => {
  sendEmail.mockResolvedValue({ data: null, error: null });

  await expectSanitizedPlanFailure();
  await expectOperationalFailure();
});

test("successful plan delivery completes once", async () => {
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

test("unrelated legacy plan-mail callers preserve swallowed failures", async () => {
  const consoleLog = spyOn(console, "log").mockImplementation(() => {});
  sendEmail.mockRejectedValueOnce(new Error("legacy provider failure"));

  try {
    await expect(
      sendUpgradePlanMail(
        "legacy@example.test",
        "Legacy",
        "PRO",
        "monthly",
        domainConfig,
      ),
    ).resolves.toBeUndefined();
  } finally {
    consoleLog.mockRestore();
  }
});

test("strict downgrade delivery sanitizes resolved provider failures", async () => {
  sendEmail.mockResolvedValueOnce({
    data: null,
    error: {
      message: "private downgrade provider details",
      name: "validation_error",
      statusCode: 422,
    },
  });

  await expect(
    sendDowngradePlanMail(
      "owner@example.test",
      "Owner",
      "FREE",
      "monthly",
      domainConfig,
      { throwOnError: true },
    ),
  ).rejects.toThrow("Email delivery failed");
});
