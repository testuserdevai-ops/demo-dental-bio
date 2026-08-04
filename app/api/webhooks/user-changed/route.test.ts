import { beforeEach, expect, mock, test } from "bun:test";

const setDentalBrandAuthority = mock(async () => ({
  id: "00000000-0000-4000-8000-000000000001",
  use_dental_brand: true,
}));
const sendPlanChangeEmail = mock(async () => undefined);

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
  getDomainConfigByHostname: () => ({}),
}));

const { POST } = await import("./route");

function webhookRequest(overrides?: Record<string, unknown>) {
  return new Request("https://dental.test/api/webhooks/user-changed", {
    method: "POST",
    headers: { authorization: "Bearer local-user-change-secret" },
    body: JSON.stringify({
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
        subscription_status: "PRO",
        billing_cycle: "monthly",
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
  sendPlanChangeEmail.mockClear();
});

test("downgrade branding enforcement uses controlled server authority", async () => {
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(setDentalBrandAuthority).toHaveBeenCalledWith(
    "00000000-0000-4000-8000-000000000001",
    true,
  );
});

test("downgrade branding authority failures request a webhook retry", async () => {
  setDentalBrandAuthority.mockRejectedValueOnce(new Error("database denied"));

  expect((await POST(webhookRequest())).status).toBe(500);
});

test("downgrade branding rejects malformed webhook identity before authority", async () => {
  expect((await POST(webhookRequest({ id: "not-a-user-id" }))).status).toBe(
    400,
  );
  expect(setDentalBrandAuthority).not.toHaveBeenCalled();
});
