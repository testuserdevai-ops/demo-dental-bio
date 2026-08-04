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
const listSubscriptions = mock(
  async (): Promise<{
    data: Array<ReturnType<typeof subscription>>;
    has_more?: boolean;
  }> => ({ data: [] }),
);
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
const processStripeSubscriptionDeletion = mock(
  async (): Promise<
    | "current_cleared"
    | "pending_cleared"
    | "already_cleared"
    | "stale"
    | "customer_deleted"
  > => "current_cleared",
);
const finishSubscriptionCancellation = mock(async () => "cleared" as const);
const applySubscriptionUpdateCas = mock(async () => {
  callOrder.push("authority");
  return "applied" as "applied" | "conflict" | "pending_cancellation";
});
const getSubscriptionAuthorityForStripeCustomer = mock(
  async (): Promise<any> => ({
    user_id: "00000000-0000-4000-8000-000000000001",
    subscription_id: "sub_1",
    pending_subscription_id: null,
    subscription_status: "PRO",
  }),
);
mock.module("@/lib/dashboard/authority-write", () => ({
  updateSubscriptionAuthorityForStripeCustomer,
  clearSubscriptionAuthorityForStripeCustomer,
  clearPendingCancellationForStripeCustomer,
  clearStripeCustomerAuthority,
  processStripeCustomerDeletion,
  processStripeSubscriptionDeletion,
  finishSubscriptionCancellation,
  applySubscriptionUpdateCas,
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
  listSubscriptions.mockReset();
  listSubscriptions.mockResolvedValue({ data: [] });
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
  processStripeSubscriptionDeletion.mockReset();
  processStripeSubscriptionDeletion.mockResolvedValue("current_cleared");
  finishSubscriptionCancellation.mockReset();
  finishSubscriptionCancellation.mockResolvedValue("cleared");
  applySubscriptionUpdateCas.mockReset();
  applySubscriptionUpdateCas.mockImplementation(async () => {
    callOrder.push("authority");
    return "applied";
  });
  getSubscriptionAuthorityForStripeCustomer.mockReset();
  getSubscriptionAuthorityForStripeCustomer.mockResolvedValue({
    user_id: "00000000-0000-4000-8000-000000000001",
    subscription_id: "sub_1",
    pending_subscription_id: null,
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
  expect(applySubscriptionUpdateCas).toHaveBeenCalled();
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(sendInvoice).not.toHaveBeenCalled();
  expect(listSubscriptions).toHaveBeenCalledWith({
    customer: "cus_owner",
    status: "all",
    limit: 100,
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
  expect(applySubscriptionUpdateCas).not.toHaveBeenCalled();
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(sendInvoice).not.toHaveBeenCalled();

  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: subscription() },
  };
  applySubscriptionUpdateCas.mockRejectedValueOnce(
    new Error("database failed"),
  );
  expect((await POST(webhookRequest())).status).toBe(500);
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(sendInvoice).not.toHaveBeenCalled();
  expect(listSubscriptions).toHaveBeenCalledTimes(1);
  expect(cancelSubscription).not.toHaveBeenCalled();
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

  expect(applySubscriptionUpdateCas).toHaveBeenCalledWith(
    expect.objectContaining({
      customerId: "cus_owner",
      subscriptionId: "sub_1",
    }),
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
  retrieveSubscription.mockResolvedValueOnce(
    subscription("incomplete_expired"),
  );
  processStripeSubscriptionDeletion.mockRejectedValueOnce(
    new Error("database unavailable"),
  );

  const response = await POST(webhookRequest());

  expect(response.status).toBe(500);
  expect(processStripeSubscriptionDeletion).toHaveBeenCalledWith(
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
  expect(processStripeSubscriptionDeletion).toHaveBeenCalledWith(
    "cus_owner",
    "sub_1",
  );

  processStripeSubscriptionDeletion.mockClear();
  processStripeSubscriptionDeletion.mockResolvedValueOnce("already_cleared");
  expect((await POST(webhookRequest())).status).toBe(200);
  expect(processStripeSubscriptionDeletion).toHaveBeenCalledWith(
    "cus_owner",
    "sub_1",
  );
});

test("subscription deletion acknowledges stale events and rejects inconsistent authority", async () => {
  stripeEvent = {
    type: "customer.subscription.deleted",
    data: { object: subscription("canceled") },
  };
  processStripeSubscriptionDeletion.mockResolvedValueOnce("stale");
  expect((await POST(webhookRequest())).status).toBe(200);

  processStripeSubscriptionDeletion.mockRejectedValueOnce(
    new Error("database failed"),
  );
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

  processStripeSubscriptionDeletion.mockResolvedValueOnce("customer_deleted");
  stripeEvent = {
    type: "customer.subscription.deleted",
    data: { object: subscription("canceled") },
  };

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(processStripeSubscriptionDeletion).toHaveBeenCalledWith(
    "cus_owner",
    "sub_1",
  );
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

test("subscription deletion accepts a concurrent duplicate result", async () => {
  stripeEvent = {
    type: "customer.subscription.deleted",
    data: { object: subscription("canceled") },
  };
  processStripeSubscriptionDeletion.mockResolvedValueOnce("already_cleared");

  expect((await POST(webhookRequest())).status).toBe(200);
});

test("a delayed older subscription update cannot replace or cancel newer authority", async () => {
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: subscription("active", "price_pro_monthly", "in_old") },
  };
  getSubscriptionAuthorityForStripeCustomer.mockResolvedValueOnce({
    user_id: "00000000-0000-4000-8000-000000000001",
    subscription_id: "sub_2",
    pending_subscription_id: null,
    subscription_status: "PRO",
  });

  const response = await POST(webhookRequest());

  expect(response.status).toBe(200);
  expect(retrieveSubscription).toHaveBeenNthCalledWith(1, "sub_1");
  expect(retrieveSubscription).toHaveBeenNthCalledWith(2, "sub_2");
  expect(applySubscriptionUpdateCas).not.toHaveBeenCalled();
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
  processStripeSubscriptionDeletion.mockResolvedValueOnce("pending_cleared");

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(processStripeSubscriptionDeletion).toHaveBeenCalledWith(
    "cus_owner",
    "sub_1",
  );
});

test("subscription deletion acknowledges only a private customer tombstone when no user remains linked", async () => {
  stripeEvent = {
    type: "customer.subscription.deleted",
    data: { object: subscription("canceled") },
  };
  processStripeSubscriptionDeletion.mockResolvedValueOnce("customer_deleted");

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(processStripeSubscriptionDeletion).toHaveBeenCalledWith(
    "cus_owner",
    "sub_1",
  );

  processStripeSubscriptionDeletion.mockRejectedValueOnce(
    new Error("Stripe customer is not linked to a user"),
  );
  expect((await POST(webhookRequest())).status).toBe(500);
});

test("authoritative canceled and incomplete-expired candidates never promote paid authority", async () => {
  for (const status of ["canceled", "incomplete_expired"] as const) {
    retrieveSubscription.mockReset();
    retrieveSubscription.mockResolvedValueOnce(subscription(status));
    stripeEvent = {
      type: "customer.subscription.updated",
      data: { object: subscription("active") },
    };
    processStripeSubscriptionDeletion.mockClear();
    applySubscriptionUpdateCas.mockClear();

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(processStripeSubscriptionDeletion).toHaveBeenCalledWith(
      "cus_owner",
      "sub_1",
    );
    expect(applySubscriptionUpdateCas).not.toHaveBeenCalled();
    expect(updateSubscriptionAuthorityForStripeCustomer).not.toHaveBeenCalled();
    expect(retrieveInvoice).not.toHaveBeenCalled();
    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(listPaymentMethods).not.toHaveBeenCalled();
  }
});

test("equal-created subscription updates converge by stable subscription ID", async () => {
  const candidate = subscription(
    "active",
    "price_pro_monthly",
    "in_2",
    "sub_2",
    100,
  );
  const current = subscription(
    "active",
    "price_pro_monthly",
    "in_1",
    "sub_1",
    100,
  );
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: candidate },
  };
  getSubscriptionAuthorityForStripeCustomer.mockResolvedValueOnce({
    user_id: "00000000-0000-4000-8000-000000000001",
    subscription_id: "sub_1",
    pending_subscription_id: null,
    pending_cancellation_subscription_id: null,
    subscription_status: "PRO",
  });
  retrieveSubscription.mockImplementation(async (id: string) =>
    id === "sub_2" ? candidate : current,
  );
  listSubscriptions.mockResolvedValueOnce({ data: [candidate, current] });

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(applySubscriptionUpdateCas).toHaveBeenCalledWith(
    expect.objectContaining({
      expectedSubscriptionId: "sub_1",
      subscriptionId: "sub_2",
    }),
  );
  expect(cancelSubscription).toHaveBeenCalledWith("sub_1");
  expect(cancelSubscription).not.toHaveBeenCalledWith("sub_2");
});

test("an older handler that observes a higher-ranked provider subscription has no authority or cleanup effects", async () => {
  const older = subscription(
    "active",
    "price_pro_monthly",
    "in_old",
    "sub_1",
    100,
  );
  const newer = subscription(
    "active",
    "price_pro_monthly",
    "in_new",
    "sub_2",
    200,
  );
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: older },
  };
  retrieveSubscription.mockResolvedValueOnce(older);
  listSubscriptions.mockResolvedValueOnce({ data: [older, newer] });

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(applySubscriptionUpdateCas).not.toHaveBeenCalled();
  expect(updateSubscriptionAuthorityForStripeCustomer).not.toHaveBeenCalled();
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(cancelSubscription).not.toHaveBeenCalled();
  expect(listPaymentMethods).not.toHaveBeenCalled();
});

test("winner election includes higher-ranked subscriptions beyond the first provider page", async () => {
  const candidate = subscription(
    "active",
    "price_pro_monthly",
    "in_candidate",
    "sub_candidate",
    100,
  );
  const higherRanked = subscription(
    "active",
    "price_pro_monthly",
    "in_winner",
    "sub_winner",
    100,
  );
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: candidate },
  };
  getSubscriptionAuthorityForStripeCustomer.mockResolvedValueOnce({
    user_id: "00000000-0000-4000-8000-000000000001",
    subscription_id: "sub_candidate",
    pending_subscription_id: null,
    subscription_status: "PRO",
  });
  retrieveSubscription.mockResolvedValueOnce(candidate);
  listSubscriptions
    .mockResolvedValueOnce({ data: [candidate], has_more: true })
    .mockResolvedValueOnce({ data: [higherRanked], has_more: false });

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(listSubscriptions).toHaveBeenNthCalledWith(2, {
    customer: "cus_owner",
    status: "all",
    limit: 100,
    starting_after: "sub_candidate",
  });
  expect(applySubscriptionUpdateCas).not.toHaveBeenCalled();
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(cancelSubscription).not.toHaveBeenCalled();
  expect(listPaymentMethods).not.toHaveBeenCalled();
});

test("a CAS-losing older handler rereads newer authority and performs no effects", async () => {
  const older = subscription(
    "active",
    "price_pro_monthly",
    "in_old",
    "sub_1",
    100,
  );
  const newer = subscription(
    "active",
    "price_pro_monthly",
    "in_new",
    "sub_2",
    200,
  );
  stripeEvent = {
    type: "customer.subscription.updated",
    data: { object: older },
  };
  getSubscriptionAuthorityForStripeCustomer
    .mockResolvedValueOnce({
      user_id: "00000000-0000-4000-8000-000000000001",
      subscription_id: null,
      pending_subscription_id: null,
      pending_cancellation_subscription_id: null,
      subscription_status: "FREE",
    })
    .mockResolvedValueOnce({
      user_id: "00000000-0000-4000-8000-000000000001",
      subscription_id: "sub_2",
      pending_subscription_id: null,
      pending_cancellation_subscription_id: null,
      subscription_status: "PRO",
    });
  retrieveSubscription.mockImplementation(async (id: string) =>
    id === "sub_2" ? newer : older,
  );
  listSubscriptions.mockResolvedValue({ data: [older] });
  applySubscriptionUpdateCas.mockResolvedValueOnce("conflict");

  expect((await POST(webhookRequest())).status).toBe(200);
  expect(applySubscriptionUpdateCas).toHaveBeenCalledTimes(1);
  expect(updateSubscriptionAuthorityForStripeCustomer).not.toHaveBeenCalled();
  expect(retrieveInvoice).not.toHaveBeenCalled();
  expect(cancelSubscription).not.toHaveBeenCalled();
  expect(listPaymentMethods).not.toHaveBeenCalled();
});
