import { beforeEach, expect, mock, test } from "bun:test";

let requestContext: unknown;
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, requestContext),
}));

const updateSubscriptionAuthority = mock(async () => undefined);
mock.module("@/lib/dashboard/authority-write", () => ({
  updateSubscriptionAuthority,
}));

const retrieveSubscription = mock(async () => ({ status: "active" }));
const cancelSubscription = mock(async () => ({}));
mock.module("stripe", () => ({
  default: class StripeMock {
    subscriptions = {
      retrieve: retrieveSubscription,
      cancel: cancelSubscription,
    };
  },
}));

const storedUser = {
  subscription_id: "sub_old",
  subscription_status: "PRO",
  current_period_end: "2026-09-01T00:00:00.000Z",
  plan_id: "price_old",
  trial_end: null,
  billing_cycle: "monthly",
};
const select = mock(() => ({
  eq: () => ({ single: async () => ({ data: storedUser, error: null }) }),
}));
const supabase = { from: () => ({ select }) };

const { POST, PUT, DELETE } = await import("./route");

function adminRequest(body: unknown) {
  requestContext = { supabase, user: { id: "admin-1", role: "admin" } };
  return POST(
    new Request("https://dental.test/api/subscription", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

function ownerRequest(method: "PUT" | "DELETE") {
  requestContext = {
    supabase,
    user: { id: "user-1", role: "user", ...storedUser },
  };
  return (method === "PUT" ? PUT : DELETE)(
    new Request("https://dental.test/api/subscription", {
      method,
      body:
        method === "PUT"
          ? JSON.stringify({ subscription_status: "FREE" })
          : undefined,
    }),
  );
}

beforeEach(() => {
  updateSubscriptionAuthority.mockClear();
  updateSubscriptionAuthority.mockResolvedValue(undefined);
  retrieveSubscription.mockClear();
  cancelSubscription.mockClear();
});

test("admin transition rejects unknown fields, statuses, and malformed dates", async () => {
  for (const body of [
    {
      id: "00000000-0000-4000-8000-000000000001",
      subscription_status: "OWNER",
      current_period_end: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000001",
      subscription_status: "PRO",
      current_period_end: "tomorrow",
    },
    {
      id: "00000000-0000-4000-8000-000000000001",
      subscription_status: "FREE",
      current_period_end: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000001",
      subscription_status: "FREE",
      current_period_end: null,
      role: "admin",
    },
  ]) {
    expect((await adminRequest(body)).status).toBe(400);
  }
  expect(updateSubscriptionAuthority).not.toHaveBeenCalled();
  expect(retrieveSubscription).not.toHaveBeenCalled();
});

test("admin transition skips Stripe when the database transition fails", async () => {
  updateSubscriptionAuthority.mockRejectedValueOnce(
    new Error("database failed"),
  );

  await expect(
    adminRequest({
      id: "00000000-0000-4000-8000-000000000001",
      subscription_status: "FREE",
      current_period_end: null,
    }),
  ).rejects.toThrow("database failed");
  expect(retrieveSubscription).not.toHaveBeenCalled();
  expect(cancelSubscription).not.toHaveBeenCalled();
});

test("admin transition compensates database authority when Stripe fails", async () => {
  cancelSubscription.mockRejectedValueOnce(new Error("stripe failed"));

  await expect(
    adminRequest({
      id: "00000000-0000-4000-8000-000000000001",
      subscription_status: "FREE",
      current_period_end: null,
    }),
  ).rejects.toThrow("stripe failed");
  expect(updateSubscriptionAuthority).toHaveBeenNthCalledWith(
    1,
    "00000000-0000-4000-8000-000000000001",
    expect.objectContaining({ subscription_status: "FREE" }),
  );
  expect(updateSubscriptionAuthority).toHaveBeenNthCalledWith(
    2,
    "00000000-0000-4000-8000-000000000001",
    storedUser,
  );
});

test("owner PUT and DELETE never report success after Stripe failure and restore authority", async () => {
  for (const method of ["PUT", "DELETE"] as const) {
    updateSubscriptionAuthority.mockClear();
    cancelSubscription.mockRejectedValueOnce(new Error("stripe failed"));

    await expect(ownerRequest(method)).rejects.toThrow("stripe failed");
    expect(updateSubscriptionAuthority).toHaveBeenNthCalledWith(
      2,
      "user-1",
      expect.objectContaining({
        subscription_id: "sub_old",
        subscription_status: "PRO",
      }),
    );
  }
});

test("owner PUT and DELETE skip Stripe after a database failure", async () => {
  for (const method of ["PUT", "DELETE"] as const) {
    updateSubscriptionAuthority.mockClear();
    retrieveSubscription.mockClear();
    cancelSubscription.mockClear();
    updateSubscriptionAuthority.mockRejectedValueOnce(
      new Error("database failed"),
    );

    await expect(ownerRequest(method)).rejects.toThrow("database failed");
    expect(retrieveSubscription).not.toHaveBeenCalled();
    expect(cancelSubscription).not.toHaveBeenCalled();
  }
});

test("owner PUT rejects extra subscription authority input", async () => {
  requestContext = {
    supabase,
    user: { id: "user-1", role: "user", ...storedUser },
  };

  const response = await PUT(
    new Request("https://dental.test/api/subscription", {
      method: "PUT",
      body: JSON.stringify({
        subscription_status: "FREE",
        current_period_end: "2026-09-01T00:00:00.000Z",
      }),
    }),
  );

  expect(response.status).toBe(400);
  expect(updateSubscriptionAuthority).not.toHaveBeenCalled();
});
