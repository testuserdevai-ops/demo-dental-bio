import { beforeEach, expect, mock, test } from "bun:test";

let stripeEvent: Record<string, unknown>;
let callOrder: string[];
const constructEvent = mock(() => stripeEvent);
const retrieveCustomer = mock(async () => {
  throw new Error("webhook ownership must not resolve by customer email");
});
const retrieveInvoice = mock(async () => ({
  collection_method: "charge_automatically",
}));
const sendInvoice = mock(async (invoiceId: string) => {
  callOrder.push(`invoice:${invoiceId}`);
  return {};
});
const listSubscriptions = mock(async () => ({ data: [] }));
const retrieveSubscription = mock(async (subscriptionId: string) =>
  subscription(
    "active",
    "price_pro_monthly",
    "in_1",
    subscriptionId,
    subscriptionId === "sub_2" ? 200 : 100,
  ),
);
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
      sendInvoice,
    };
    subscriptions = {
      list: listSubscriptions,
      retrieve: retrieveSubscription,
      cancel: cancelSubscription,
    };
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

const updateSubscriptionAuthorityForStripeCustomer = mock(async () => {
  callOrder.push("authority");
});
const clearSubscriptionAuthorityForStripeCustomer = mock(async () => undefined);
const clearPendingCancellationForStripeCustomer = mock(async () => undefined);
const clearStripeCustomerAuthority = mock(async () => undefined);
const processStripeCustomerDeletion = mock(
  async (): Promise<"processed" | "already_processed"> => "processed",
);
const getSubscriptionAuthorityForStripeCustomer = mock(
  async (): Promise<{
    id: string;
    subscription_id: string | null;
    pending_cancellation_subscription_id: string | null;
    subscription_status: string | null;
  } | null> => ({
    id: "user-1",
    subscription_id: "sub_1",
    pending_cancellation_subscription_id: null,
    subscription_status: "PRO",
  }),
);
mock.module("@/lib/dashboard/authority-write", () => ({
  updateSubscriptionAuthorityForStripeCustomer,
  clearSubscriptionAuthorityForStripeCustomer,
  clearPendingCancellationForStripeCustomer,
  clearStripeCustomerAuthority,
  processStripeCustomerDeletion,
  getSubscriptionAuthorityForStripeCustomer,
}));

const { POST } = await import("./route");

function subscription(
  status = "active",
  priceId = "price_pro_monthly",
  latestInvoice: string | { id: string } | null = "in_1",
  id = "sub_1",
  created = 100,
) {
  return {
    id,
    created,
    customer: "cus_owner",
    status,
    metadata: { userId: "user-1" },
    latest_invoice: latestInvoice,
    current_period_end: 2_000_000_000,
    trial_end: null,
    items: {
      data: [
        {
          price: { id: priceId, recurring: { interval: "month" } },
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
  callOrder = [];
  retrieveCustomer.mockClear();
  retrieveInvoice.mockClear();
  retrieveInvoice.mockResolvedValue({
    collection_method: "charge_automatically",
  });
  sendInvoice.mockClear();
  listSubscriptions.mockClear();
  cancelSubscription.mockClear();
  retrieveSubscription.mockReset();
  retrieveSubscription.mockImplementation(async (subscriptionId: string) =>
    subscription(
      "active",
      "price_pro_monthly",
      "in_1",
      subscriptionId,
      subscriptionId === "sub_2" ? 200 : 100,
    ),
  );
  listPaymentMethods.mockClear();
  updateSubscriptionAuthorityForStripeCustomer.mockClear();
  clearSubscriptionAuthorityForStripeCustomer.mockClear();
  clearPendingCancellationForStripeCustomer.mockClear();
  clearStripeCustomerAuthority.mockClear();
  processStripeCustomerDeletion.mockReset();
  processStripeCustomerDeletion.mockResolvedValue("processed");
  getSubscriptionAuthorityForStripeCustomer.mockReset();
  getSubscriptionAuthorityForStripeCustomer.mockResolvedValue({
    id: "user-1",
    subscription_id: "sub_1",
    pending_cancellation_subscription_id: null,
    subscription_status: "PRO",
  });
  detachPaymentMethod.mockClear();
  detachPromise = Promise.resolve({});
});

test("subscription update persists authority before idempotent invoice sending", async () => {
  const providerSubscription = subscription("active", "price_pro_monthly", {
    id: "in_1",
  });
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: providerSubscription },
  };
  retrieveSubscription.mockResolvedValueOnce(providerSubscription);
  retrieveInvoice.mockImplementationOnce(async () => {
    callOrder.push("invoice-read");
    return { collection_method: "send_invoice" };
  });

  const response = await POST(webhookRequest());

  expect(response.status).toBe(200);
  expect(callOrder.slice(0, 3)).toEqual([
    "authority",
    "invoice-read",
    "invoice:in_1",
  ]);
  expect(sendInvoice).toHaveBeenCalledWith(
    "in_1",
    {},
    { idempotencyKey: "dentalbio:invoice-send:in_1" },
  );
});

test("subscription update without an invoice skips invoice work and succeeds", async () => {
  const providerSubscription = subscription(
    "active",
    "price_pro_monthly",
    null,
  );
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: providerSubscription },
  };
  retrieveSubscription.mockResolvedValueOnce(providerSubscription);

  const response = await POST(webhookRequest());

  expect(response.status).toBe(200);
  expect(updateSubscriptionAuthorityForStripeCustomer).toHaveBeenCalled();
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(sendInvoice).not.toHaveBeenCalled();
  expect(listSubscriptions).toHaveBeenCalledWith({
    customer: "cus_owner",
    status: "all",
  });
});

test("invalid prices and failed authority writes have no invoice/provider side effects", async () => {
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: subscription("active", "price_unknown") },
  };
  retrieveSubscription.mockResolvedValueOnce(
    subscription("active", "price_unknown"),
  );
  expect((await POST(webhookRequest())).status).toBe(500);
  expect(updateSubscriptionAuthorityForStripeCustomer).not.toHaveBeenCalled();
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(sendInvoice).not.toHaveBeenCalled();

  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: subscription() },
  };
  updateSubscriptionAuthorityForStripeCustomer.mockRejectedValueOnce(
    new Error("database failed"),
  );
  expect((await POST(webhookRequest())).status).toBe(500);
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(sendInvoice).not.toHaveBeenCalled();
  expect(listSubscriptions).not.toHaveBeenCalled();
  expect(detachPaymentMethod).not.toHaveBeenCalled();
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
    false,
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

test("customer deletion rejects a genuinely unknown customer", async () => {
  stripeEvent = {
    type: "customer.deleted",
    data: { object: { id: "cus_missing" } },
  };
  processStripeCustomerDeletion.mockRejectedValueOnce(
    new Error("Stripe customer is not linked to a user"),
  );

  const response = await POST(webhookRequest());

  expect(response.status).toBe(500);
  expect(processStripeCustomerDeletion).toHaveBeenCalledWith("cus_missing");
});

test("subscription deletion applies once and acknowledges application-cancel duplicates", async () => {
  stripeEvent = {
    type: "customer.subscription.deleted",
    data: { object: subscription("canceled") },
  };

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(clearSubscriptionAuthorityForStripeCustomer).toHaveBeenCalledWith(
    "cus_owner",
    "sub_1",
    false,
  );

  clearSubscriptionAuthorityForStripeCustomer.mockClear();
  getSubscriptionAuthorityForStripeCustomer.mockResolvedValueOnce({
    id: "user-1",
    subscription_id: null,
    pending_cancellation_subscription_id: null,
    subscription_status: "FREE",
  });
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(clearSubscriptionAuthorityForStripeCustomer).not.toHaveBeenCalled();
});

test("subscription deletion acknowledges stale events and rejects inconsistent authority", async () => {
  stripeEvent = {
    type: "customer.subscription.deleted",
    data: { object: subscription("canceled") },
  };
  getSubscriptionAuthorityForStripeCustomer.mockResolvedValueOnce({
    id: "user-1",
    subscription_id: "sub_new",
    pending_cancellation_subscription_id: null,
    subscription_status: "PRO",
  });
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(clearSubscriptionAuthorityForStripeCustomer).not.toHaveBeenCalled();

  getSubscriptionAuthorityForStripeCustomer.mockRejectedValueOnce(
    new Error("database failed"),
  );
  expect((await POST(webhookRequest())).status).toBe(500);

  getSubscriptionAuthorityForStripeCustomer.mockResolvedValueOnce({
    id: "user-1",
    subscription_id: null,
    pending_cancellation_subscription_id: null,
    subscription_status: "PRO",
  });
  expect((await POST(webhookRequest())).status).toBe(500);
});

test("customer deletion is idempotent and permits a delayed subscription deletion", async () => {
  stripeEvent = {
    type: "customer.deleted",
    data: { object: { id: "cus_owner" } },
  };

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(processStripeCustomerDeletion).toHaveBeenCalledWith("cus_owner");

  processStripeCustomerDeletion.mockResolvedValueOnce("already_processed");
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(processStripeCustomerDeletion).toHaveBeenCalledTimes(2);

  getSubscriptionAuthorityForStripeCustomer.mockResolvedValueOnce(null);
  stripeEvent = {
    type: "customer.subscription.deleted",
    data: { object: subscription("canceled") },
  };

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(clearSubscriptionAuthorityForStripeCustomer).not.toHaveBeenCalled();
});

test("unknown subscription updates still request a retry", async () => {
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: subscription() },
  };
  getSubscriptionAuthorityForStripeCustomer.mockResolvedValueOnce(null);

  expect((await POST(webhookRequest())).status).toBe(500);
  expect(updateSubscriptionAuthorityForStripeCustomer).not.toHaveBeenCalled();
  expect(retrieveSubscription).not.toHaveBeenCalled();
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(listSubscriptions).not.toHaveBeenCalled();
});

test("subscription deletion accepts a concurrent duplicate after a zero-row clear", async () => {
  stripeEvent = {
    type: "customer.subscription.deleted",
    data: { object: subscription("canceled") },
  };
  getSubscriptionAuthorityForStripeCustomer
    .mockResolvedValueOnce({
      id: "user-1",
      subscription_id: "sub_1",
      pending_cancellation_subscription_id: null,
      subscription_status: "PRO",
    })
    .mockResolvedValueOnce({
      id: "user-1",
      subscription_id: null,
      pending_cancellation_subscription_id: null,
      subscription_status: "FREE",
    });
  clearSubscriptionAuthorityForStripeCustomer.mockRejectedValueOnce(
    new Error("user was not found"),
  );

  expect((await POST(webhookRequest())).status).toBe(200);
});

test("a delayed older subscription update cannot replace or cancel newer authority", async () => {
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: subscription("active", "price_pro_monthly", "in_old") },
  };
  getSubscriptionAuthorityForStripeCustomer.mockResolvedValueOnce({
    id: "user-1",
    subscription_id: "sub_2",
    pending_cancellation_subscription_id: null,
    subscription_status: "PRO",
  });

  const response = await POST(webhookRequest());

  expect(response.status).toBe(200);
  expect(retrieveSubscription).toHaveBeenNthCalledWith(1, "sub_1");
  expect(retrieveSubscription).toHaveBeenNthCalledWith(2, "sub_2");
  expect(updateSubscriptionAuthorityForStripeCustomer).not.toHaveBeenCalled();
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(sendInvoice).not.toHaveBeenCalled();
  expect(listSubscriptions).not.toHaveBeenCalled();
  expect(cancelSubscription).not.toHaveBeenCalled();
  expect(listPaymentMethods).not.toHaveBeenCalled();
  expect(detachPaymentMethod).not.toHaveBeenCalled();
});

test("subscription deletion clears matching pending cancellation without clobbering newer authority", async () => {
  stripeEvent = {
    type: "customer.subscription.deleted",
    data: { object: subscription("canceled") },
  };
  getSubscriptionAuthorityForStripeCustomer.mockResolvedValueOnce({
    id: "user-1",
    subscription_id: "sub_2",
    pending_cancellation_subscription_id: "sub_1",
    subscription_status: "PRO",
  });

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(clearPendingCancellationForStripeCustomer).toHaveBeenCalledWith(
    "cus_owner",
    "sub_1",
  );
  expect(clearSubscriptionAuthorityForStripeCustomer).not.toHaveBeenCalled();
});
