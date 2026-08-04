import { beforeEach, expect, mock, spyOn, test } from "bun:test";

const setDentalBrandAuthority = mock(async () => ({
  id: "00000000-0000-4000-8000-000000000001",
  use_dental_brand: true,
}));
const sendPlanChangeEmail = mock(async () => undefined);
const getDomainConfigByHostname = mock(() => ({}));

mock.module("@/lib/dashboard/authority-write", () => ({
  setDentalBrandAuthority,
}));
mock.module("@/utils/mails/sendTemplateEmails", () => ({
  sendPlanChangeEmail,
}));
mock.module("@/utils/functions/functions", () => ({
  capitalize: (value: string) => value,
}));
mock.module("@/utils/domainConfig", () => ({
  getDomainConfigByHostname,
}));

const { POST } = await import("./route");

function webhookRequest(
  overrides?: Record<string, unknown>,
  authorization: string | null = "Bearer local-user-change-secret",
  rawBody?: string,
  oldRecordOverrides?: Record<string, unknown>,
) {
  const headers = new Headers();
  if (authorization !== null) headers.set("authorization", authorization);

  return new Request("https://dental.test/api/webhooks/user-changed", {
    method: "POST",
    headers,
    body:
      rawBody ??
      JSON.stringify({
        record: {
          id: "00000000-0000-4000-8000-000000000001",
          email: "owner@example.test",
          subscription_status: "PRO",
          billing_cycle: "monthly",
          use_dental_brand: false,
          registered_domain: "dental.test",
          ...overrides,
        },
        old_record: {
          subscription_status: "PREMIUM PRO",
          billing_cycle: "monthly",
          ...oldRecordOverrides,
        },
      }),
  });
}

beforeEach(() => {
  process.env.WEBHOOK_SECRET = "local-user-change-secret";
  setDentalBrandAuthority.mockReset();
  setDentalBrandAuthority.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000001",
    use_dental_brand: true,
  });
  sendPlanChangeEmail.mockReset();
  sendPlanChangeEmail.mockResolvedValue(undefined);
  getDomainConfigByHostname.mockClear();
});

test("downgrade branding enforcement uses controlled server authority", async () => {
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(setDentalBrandAuthority).toHaveBeenCalledWith(
    "00000000-0000-4000-8000-000000000001",
    true,
  );
});

test("configured SQL producer payload authenticates and sends the plan-change email", async () => {
  const response = await POST(webhookRequest({ use_dental_brand: true }));

  expect(response.status).toBe(200);
  expect(getDomainConfigByHostname).toHaveBeenCalledWith("dental.test");
  expect(sendPlanChangeEmail).toHaveBeenCalledWith(
    "owner@example.test",
    "PREMIUM PRO",
    "monthly",
    "PRO",
    "monthly",
    {},
    { throwOnError: true },
  );
  expect(setDentalBrandAuthority).not.toHaveBeenCalled();
});

test("normalized legacy producer payloads send only controlled plan values", async () => {
  const cases = [
    {
      record: { subscription_status: "PRO", use_dental_brand: true },
      oldRecord: { subscription_status: "FREE" },
      expected: ["FREE", "monthly", "PRO", "monthly"],
    },
    {
      record: { subscription_status: "FREE", use_dental_brand: true },
      oldRecord: { subscription_status: "PRO" },
      expected: ["PRO", "monthly", "FREE", "monthly"],
    },
    {
      record: {
        subscription_status: "FREE",
        billing_cycle: "annually",
        use_dental_brand: true,
      },
      oldRecord: { subscription_status: "FREE", billing_cycle: "monthly" },
      expected: ["FREE", "monthly", "FREE", "annually"],
    },
  ] as const;

  for (const { record, oldRecord, expected } of cases) {
    sendPlanChangeEmail.mockClear();

    expect(
      (await POST(webhookRequest(record, undefined, undefined, oldRecord)))
        .status,
    ).toBe(200);
    expect(sendPlanChangeEmail).toHaveBeenCalledWith(
      "owner@example.test",
      ...expected,
      {},
      { throwOnError: true },
    );
  }
  expect(setDentalBrandAuthority).not.toHaveBeenCalled();
});

test("consumer rejects null subscription status instead of widening the plan contract", async () => {
  expect(
    (await POST(webhookRequest({ subscription_status: null }))).status,
  ).toBe(400);
  expect(
    (
      await POST(
        webhookRequest(undefined, undefined, undefined, {
          subscription_status: null,
        }),
      )
    ).status,
  ).toBe(400);
  expect(sendPlanChangeEmail).not.toHaveBeenCalled();
});

test("downgrade branding authority failures are recorded for explicit operational replay", async () => {
  const consoleError = spyOn(console, "error").mockImplementation(() => {});
  setDentalBrandAuthority.mockRejectedValueOnce(new Error("database denied"));

  try {
    expect((await POST(webhookRequest())).status).toBe(500);
  } finally {
    consoleError.mockRestore();
  }
});

test("plan-mail failures are recorded without exposing delivery details", async () => {
  const providerText = "private provider diagnostic";
  const recipientText = "private-recipient@example.test";
  const secretText = "private-provider-secret";
  const consoleError = spyOn(console, "error").mockImplementation(() => {});
  sendPlanChangeEmail.mockRejectedValueOnce(
    new Error(`${providerText} ${recipientText} ${secretText}`),
  );

  try {
    const response = await POST(webhookRequest({ use_dental_brand: true }));
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

test("downgrade branding rejects malformed webhook identity before authority", async () => {
  expect((await POST(webhookRequest({ id: "not-a-user-id" }))).status).toBe(
    400,
  );
  expect(setDentalBrandAuthority).not.toHaveBeenCalled();
});

test("an unset webhook secret rejects the literal Bearer undefined before parsing or side effects", async () => {
  delete process.env.WEBHOOK_SECRET;

  expect(
    (await POST(webhookRequest(undefined, "Bearer undefined", "{"))).status,
  ).toBe(401);
  expect(
    (await POST(webhookRequest(undefined, "Bearer undefined"))).status,
  ).toBe(401);
  expect(setDentalBrandAuthority).not.toHaveBeenCalled();
  expect(sendPlanChangeEmail).not.toHaveBeenCalled();
  expect(getDomainConfigByHostname).not.toHaveBeenCalled();
});

test("empty and whitespace-only webhook secrets fail closed", async () => {
  for (const configuredSecret of ["", "   "]) {
    process.env.WEBHOOK_SECRET = configuredSecret;

    expect(
      (await POST(webhookRequest(undefined, `Bearer ${configuredSecret}`)))
        .status,
    ).toBe(401);
    expect(setDentalBrandAuthority).not.toHaveBeenCalled();
    expect(sendPlanChangeEmail).not.toHaveBeenCalled();
    expect(getDomainConfigByHostname).not.toHaveBeenCalled();
  }
});

test("a configured secret rejects invalid and missing authorization headers", async () => {
  expect((await POST(webhookRequest(undefined, "Bearer wrong"))).status).toBe(
    401,
  );
  expect((await POST(webhookRequest(undefined, null))).status).toBe(401);
  expect(setDentalBrandAuthority).not.toHaveBeenCalled();
  expect(sendPlanChangeEmail).not.toHaveBeenCalled();
  expect(getDomainConfigByHostname).not.toHaveBeenCalled();
});
