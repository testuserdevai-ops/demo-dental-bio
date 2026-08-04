import { beforeEach, expect, mock, spyOn, test } from "bun:test";

const sendVerificationMail = mock(async (): Promise<void> => undefined);
const getDomainConfig = mock(() => ({}));
const requestHeaders = new Headers({ host: "dental.test" });

mock.module("@/utils/mails/sendVerificationMail", () => ({
  sendVerificationMail,
}));
mock.module("@/utils/domainConfig", () => ({ getDomainConfig }));
mock.module("next/headers", () => ({
  headers: async () => requestHeaders,
}));

const { POST } = await import("./route");

function webhookRequest(
  overrides?: Record<string, unknown>,
  authorization: string | null = "Bearer local-verification-secret",
  rawBody?: string,
) {
  const requestHeaders = new Headers();
  if (authorization !== null) {
    requestHeaders.set("authorization", authorization);
  }

  return new Request("https://dental.test/api/webhooks/verification-changed", {
    method: "POST",
    headers: requestHeaders,
    body:
      rawBody ??
      JSON.stringify({
        id: "00000000-0000-4000-8000-000000000001",
        email: "owner@example.test",
        username: "owner",
        first_name: "Owner",
        isVerified: true,
        timestamp: "2026-08-04T04:50:09.000Z",
        ...overrides,
      }),
  });
}

beforeEach(() => {
  process.env.CRON_SECRET_KEY = "local-verification-secret";
  sendVerificationMail.mockReset();
  sendVerificationMail.mockResolvedValue(undefined);
  getDomainConfig.mockClear();
});

test("unset verification secret rejects literal Bearer undefined before parsing or side effects", async () => {
  delete process.env.CRON_SECRET_KEY;

  expect(
    (await POST(webhookRequest(undefined, "Bearer undefined", "{"))).status,
  ).toBe(401);
  expect(sendVerificationMail).not.toHaveBeenCalled();
  expect(getDomainConfig).not.toHaveBeenCalled();
});

test("empty and whitespace-only verification secrets fail closed", async () => {
  for (const configuredSecret of ["", "   "]) {
    process.env.CRON_SECRET_KEY = configuredSecret;

    expect(
      (await POST(webhookRequest(undefined, `Bearer ${configuredSecret}`)))
        .status,
    ).toBe(401);
    expect(sendVerificationMail).not.toHaveBeenCalled();
    expect(getDomainConfig).not.toHaveBeenCalled();
  }
});

test("configured verification secret rejects invalid and missing authorization", async () => {
  expect((await POST(webhookRequest(undefined, "Bearer wrong"))).status).toBe(
    401,
  );
  expect((await POST(webhookRequest(undefined, null))).status).toBe(401);
  expect(sendVerificationMail).not.toHaveBeenCalled();
  expect(getDomainConfig).not.toHaveBeenCalled();
});

test("strict verification payload rejects malformed producer data", async () => {
  const invalidPayloads = [
    { id: "not-a-uuid" },
    { email: "not-an-email" },
    { username: " " },
    { first_name: "" },
    { isVerified: false },
    { timestamp: "not-a-datetime" },
    { unexpected: "field" },
  ];

  expect((await POST(webhookRequest(undefined, undefined, "{"))).status).toBe(
    400,
  );
  for (const payload of invalidPayloads) {
    expect((await POST(webhookRequest(payload))).status).toBe(400);
  }
  expect(sendVerificationMail).not.toHaveBeenCalled();
  expect(getDomainConfig).not.toHaveBeenCalled();
});

test("valid configured producer payload is awaited before success", async () => {
  let resolveMail!: () => void;
  let markMailStarted!: () => void;
  const mailStarted = new Promise<void>((resolve) => {
    markMailStarted = resolve;
  });
  sendVerificationMail.mockImplementationOnce(() => {
    markMailStarted();
    return new Promise<void>((resolve) => {
      resolveMail = resolve;
    });
  });

  const responsePromise = POST(webhookRequest());
  await mailStarted;
  expect(
    await Promise.race([
      responsePromise.then(() => "resolved"),
      Promise.resolve("pending"),
    ]),
  ).toBe("pending");

  resolveMail();
  expect((await responsePromise).status).toBe(200);
  expect(getDomainConfig).toHaveBeenCalledWith(requestHeaders);
  expect(sendVerificationMail).toHaveBeenCalledWith(
    "owner@example.test",
    "owner",
    "Owner",
    {},
  );
});

test("verification mail failure is recorded for explicit operational replay", async () => {
  const providerText = "provider diagnostic should stay private";
  const recipientText = "private-recipient@example.test";
  const secretText = "private-provider-secret";
  const consoleError = spyOn(console, "error").mockImplementation(() => {});

  sendVerificationMail.mockRejectedValueOnce(
    new Error(`${providerText} ${recipientText} ${secretText}`),
  );

  try {
    expect((await POST(webhookRequest())).status).toBe(500);

    expect(consoleError.mock.calls.length).toBe(1);
    expect(consoleError.mock.calls[0]?.length).toBe(1);
    expect(consoleError.mock.calls[0]?.[0]).toBe(
      "Verification webhook delivery failed",
    );

    const loggedText = consoleError.mock.calls.flat().map(String).join(" ");
    expect(loggedText.includes(providerText)).toBe(false);
    expect(loggedText.includes(recipientText)).toBe(false);
    expect(loggedText.includes(secretText)).toBe(false);
  } finally {
    consoleError.mockRestore();
  }
});
