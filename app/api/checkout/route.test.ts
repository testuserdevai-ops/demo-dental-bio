import { beforeEach, expect, mock, test } from "bun:test";

const stripeCustomerCreate = mock(async () => ({ id: "cus_owner" }));
const stripeCustomerList = mock(async () => ({ data: [] }));
const stripeCustomerDelete = mock(async () => ({}));
const stripeSessionCreate = mock(async () => ({
  url: "https://checkout.test",
}));
const setStripeCustomerId = mock(async () => undefined);

mock.module("stripe", () => ({
  default: class StripeMock {
    customers = {
      create: stripeCustomerCreate,
      list: stripeCustomerList,
      del: stripeCustomerDelete,
    };
    checkout = { sessions: { create: stripeSessionCreate } };
  },
}));
mock.module("@/utils/user/getEffectiveUserId", () => ({
  getEffectiveUserId: async () => "user-1",
}));
mock.module("@/utils/global_constants", () => ({
  PRICE_ID_TO_PLAN: {
    price_free: { plan: "FREE", interval: "month" },
    price_pro: { plan: "PRO", interval: "month" },
  },
}));
mock.module("@/lib/dashboard/authority-write", () => ({ setStripeCustomerId }));
mock.module("@/utils/domainConfig", () => ({
  getDomainConfig: () => ({ baseUrl: "https://dental.test" }),
}));

let databaseUser = {
  email: "owner@dental.test",
  trial_end: null,
  subscription_status: "FREE",
  customer_id: null as string | null,
};
const select = mock(() => ({
  eq: () => ({
    single: async () => ({ data: databaseUser, error: null }),
  }),
}));
const createClient = mock(async () => ({ from: () => ({ select }) }));
mock.module("@/utils/supabase/server", () => ({
  createClient,
}));

const { POST } = await import("./route");

beforeEach(() => {
  databaseUser = {
    email: "owner@dental.test",
    trial_end: null,
    subscription_status: "FREE",
    customer_id: null,
  };
  stripeCustomerCreate.mockClear();
  stripeCustomerList.mockClear();
  stripeCustomerDelete.mockClear();
  stripeSessionCreate.mockClear();
  setStripeCustomerId.mockClear();
  setStripeCustomerId.mockResolvedValue(undefined);
  createClient.mockClear();
});

test("checkout ignores caller email and creates an immutable authenticated linkage", async () => {
  const response = await POST(
    new Request("https://dental.test/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        priceId: "price_pro",
      }),
    }),
  );

  expect(response.status).toBe(200);
  expect(select).toHaveBeenCalledWith(
    "email, trial_end, subscription_status, customer_id",
  );
  expect(stripeCustomerList).not.toHaveBeenCalled();
  expect(stripeCustomerCreate).toHaveBeenCalledWith({
    email: "owner@dental.test",
    metadata: { userId: "user-1" },
  });
  expect(setStripeCustomerId).toHaveBeenCalledWith("user-1", "cus_owner");
  expect(stripeSessionCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      customer: "cus_owner",
      metadata: { userId: "user-1" },
      subscription_data: expect.objectContaining({
        metadata: { userId: "user-1" },
      }),
    }),
  );
});

test("checkout skips session creation when customer linkage persistence fails", async () => {
  setStripeCustomerId.mockRejectedValueOnce(new Error("authority failed"));

  await expect(
    POST(
      new Request("https://dental.test/api/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId: "price_pro" }),
      }),
    ),
  ).rejects.toThrow("authority failed");
  expect(stripeCustomerDelete).toHaveBeenCalledWith("cus_owner");
  expect(stripeSessionCreate).not.toHaveBeenCalled();
});

test("checkout reuses only the immutable customer linked in the database", async () => {
  databaseUser.customer_id = "cus_existing";

  await POST(
    new Request("https://dental.test/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        priceId: "price_pro",
      }),
    }),
  );

  expect(stripeCustomerCreate).not.toHaveBeenCalled();
  expect(setStripeCustomerId).not.toHaveBeenCalled();
  expect(stripeSessionCreate).toHaveBeenCalledWith(
    expect.objectContaining({ customer: "cus_existing" }),
  );
});

test("checkout rejects extras and non-paid catalog prices before auth or providers", async () => {
  for (const body of [
    { priceId: "price_pro", email: "victim@example.test" },
    { priceId: "price_free" },
    { priceId: "price_unknown" },
    { priceId: "" },
  ]) {
    const response = await POST(
      new Request("https://dental.test/api/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    expect(response.status).toBe(400);
  }

  expect(createClient).not.toHaveBeenCalled();
  expect(stripeCustomerCreate).not.toHaveBeenCalled();
  expect(stripeSessionCreate).not.toHaveBeenCalled();
  expect(setStripeCustomerId).not.toHaveBeenCalled();
});
