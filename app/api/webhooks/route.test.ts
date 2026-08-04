import { beforeEach, expect, mock, test } from "bun:test";

let stripeEvent: Record<string, unknown>;
const constructEvent = mock(() => stripeEvent);
const retrieveCustomer = mock(async () => {
  throw new Error("webhook ownership must not resolve by customer email");
});
const retrieveInvoice = mock(async () => ({
  collection_method: "charge_automatically",
}));
const listSubscriptions = mock(async () => ({ data: [] }));
const cancelSubscription = mock(async () => ({}));
const listPaymentMethods = mock(async () => ({
  data: [
    { id: "pm_1", card: { fingerprint: "same" } },
    { id: "pm_2", card: { fingerprint: "same" } },
  ],
}));
let detachPromise: Promise<unknown> = Promise.resolve({});
const detachPaymentMethod = mock(() => detachPromise);

mock.module("stripe", () => ({
  default: class StripeMock {
    webhooks = { constructEvent };
    customers = { retrieve: retrieveCustomer };
    invoices = {
      retrieve: retrieveInvoice,
      sendInvoice: mock(async () => ({})),
    };
    subscriptions = { list: listSubscriptions, cancel: cancelSubscription };
    paymentMethods = { list: listPaymentMethods, detach: detachPaymentMethod };
  },
}));
mock.module("@/utils/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      throw new Error("unexpected mutable-email database lookup");
    },
  }),
}));
mock.module("@/utils/mails/sendTemplateEmails", () => ({
  sendTrialEndNotificationMail: mock(async () => undefined),
}));
mock.module("@/utils/domainConfig", () => ({ getDomainConfig: () => ({}) }));
mock.module("@/utils/global_constants", () => ({
  PRICE_ID_TO_PLAN: { price_pro_monthly: { plan: "PRO" } },
}));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));

const updateSubscriptionAuthorityForStripeCustomer = mock(
  async () => undefined,
);
const clearSubscriptionAuthorityForStripeCustomer = mock(async () => undefined);
const clearStripeCustomerAuthority = mock(async () => undefined);
mock.module("@/lib/dashboard/authority-write", () => ({
  updateSubscriptionAuthorityForStripeCustomer,
  clearSubscriptionAuthorityForStripeCustomer,
  clearStripeCustomerAuthority,
}));

const { POST } = await import("./route");

function subscription(status = "active") {
  return {
    id: "sub_1",
    customer: "cus_owner",
    status,
    metadata: { userId: "user-1" },
    latest_invoice: "in_1",
    current_period_end: 2_000_000_000,
    trial_end: null,
    items: {
      data: [
        {
          price: { id: "price_pro_monthly", recurring: { interval: "month" } },
        },
      ],
    },
  };
}

function webhookRequest() {
  return new Request("https://dental.test/api/webhooks", {
    method: "POST",
    headers: { "stripe-signature": "verified" },
    body: "{}",
  });
}

beforeEach(() => {
  retrieveCustomer.mockClear();
  updateSubscriptionAuthorityForStripeCustomer.mockClear();
  clearSubscriptionAuthorityForStripeCustomer.mockClear();
  clearStripeCustomerAuthority.mockClear();
  detachPaymentMethod.mockClear();
  detachPromise = Promise.resolve({});
});

test("subscription updates resolve ownership by exact customer_id and await dedupe", async () => {
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: subscription() },
  };
  let resolveDetach!: () => void;
  detachPromise = new Promise<void>((resolve) => {
    resolveDetach = resolve;
  });

  let settled = false;
  const responsePromise = POST(webhookRequest()).then((response: Response) => {
    settled = true;
    return response;
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(updateSubscriptionAuthorityForStripeCustomer).toHaveBeenCalledWith(
    "cus_owner",
    expect.objectContaining({ subscription_id: "sub_1" }),
  );
  expect(retrieveCustomer).not.toHaveBeenCalled();
  expect(settled).toBe(false);

  resolveDetach();
  expect((await responsePromise).status).toBe(200);
});

test("incomplete-expired deletion is awaited and failures request a Stripe retry", async () => {
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: subscription("incomplete_expired") },
  };
  clearSubscriptionAuthorityForStripeCustomer.mockRejectedValueOnce(
    new Error("database unavailable"),
  );

  const response = await POST(webhookRequest());

  expect(response.status).toBe(500);
  expect(clearSubscriptionAuthorityForStripeCustomer).toHaveBeenCalledWith(
    "cus_owner",
    "sub_1",
  );
});

test("dedupe provider failures reach the webhook retry response", async () => {
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: subscription() },
  };
  detachPromise = Promise.reject(new Error("detach failed"));

  const response = await POST(webhookRequest());

  expect(response.status).toBe(500);
});

test("customer deletion rejects a zero-row authority clear", async () => {
  stripeEvent = {
    type: "customer.deleted",
    data: { object: { id: "cus_missing" } },
  };
  clearStripeCustomerAuthority.mockRejectedValueOnce(
    new Error("user was not found"),
  );

  const response = await POST(webhookRequest());

  expect(response.status).toBe(500);
  expect(clearStripeCustomerAuthority).toHaveBeenCalledWith("cus_missing");
});
