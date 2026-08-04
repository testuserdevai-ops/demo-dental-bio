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
mock.module("@/utils/supabase/server", () => ({
  createClient: async () => ({ from: () => ({ select }) }),
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
});

test("checkout ignores caller email and creates an immutable authenticated linkage", async () => {
  const response = await POST(
    new Request("https://dental.test/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        priceId: "price_1",
        email: "victim@example.test",
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
        body: JSON.stringify({ priceId: "price_1" }),
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
        priceId: "price_1",
        email: "victim@example.test",
      }),
    }),
  );

  expect(stripeCustomerCreate).not.toHaveBeenCalled();
  expect(setStripeCustomerId).not.toHaveBeenCalled();
  expect(stripeSessionCreate).toHaveBeenCalledWith(
    expect.objectContaining({ customer: "cus_existing" }),
  );
});
