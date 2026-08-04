import { beforeEach, expect, mock, test } from "bun:test";

let requestContext: unknown;
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, requestContext),
}));

const updateSubscriptionAuthority = mock(async () => undefined);
const clearPendingCancellation = mock(async () => undefined);
mock.module("@/lib/dashboard/authority-write", () => ({
  updateSubscriptionAuthority,
  clearPendingCancellation,
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

type StoredUser = {
  subscription_id: string | null;
  pending_cancellation_subscription_id: string | null;
  subscription_status: string;
  current_period_end: string | null;
  plan_id: string | null;
  trial_end: string | null;
  billing_cycle: "monthly" | "annually";
};

const storedUser: StoredUser = {
  subscription_id: "sub_old",
  pending_cancellation_subscription_id: null,
  subscription_status: "PRO",
  current_period_end: "2026-09-01T00:00:00.000Z",
  plan_id: "price_old",
  trial_end: null,
  billing_cycle: "monthly",
};
let selectedUser: StoredUser = storedUser;
const select = mock(() => ({
  eq: () => ({ single: async () => ({ data: selectedUser, error: null }) }),
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

function transitionRequest(method: "POST" | "PUT" | "DELETE") {
  return method === "POST"
    ? adminRequest({
        id: "00000000-0000-4000-8000-000000000001",
        subscription_status: "FREE",
        current_period_end: null,
      })
    : ownerRequest(method);
}

beforeEach(() => {
  selectedUser = storedUser;
  updateSubscriptionAuthority.mockClear();
  updateSubscriptionAuthority.mockResolvedValue(undefined);
  clearPendingCancellation.mockClear();
  clearPendingCancellation.mockResolvedValue(undefined);
  retrieveSubscription.mockReset();
  retrieveSubscription.mockResolvedValue({ status: "active" });
  cancelSubscription.mockReset();
  cancelSubscription.mockResolvedValue({});
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
    expect.objectContaining({
      subscription_id: "sub_old",
      pending_cancellation_subscription_id: null,
      subscription_status: "PRO",
    }),
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

test("POST, PUT, and DELETE leave FREE authority after a timed-out cancellation reconciles as canceled", async () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    updateSubscriptionAuthority.mockClear();
    retrieveSubscription.mockReset();
    retrieveSubscription
      .mockResolvedValueOnce({ status: "active" })
      .mockResolvedValueOnce({ status: "canceled" });
    cancelSubscription.mockReset();
    cancelSubscription.mockRejectedValueOnce(new Error("cancel timed out"));

    await expect(transitionRequest(method)).rejects.toThrow("cancel timed out");
    expect(updateSubscriptionAuthority).toHaveBeenNthCalledWith(
      1,
      method === "POST" ? "00000000-0000-4000-8000-000000000001" : "user-1",
      expect.objectContaining({
        subscription_id: null,
        pending_cancellation_subscription_id: "sub_old",
      }),
    );
    expect(clearPendingCancellation).toHaveBeenCalledWith(
      method === "POST" ? "00000000-0000-4000-8000-000000000001" : "user-1",
      "sub_old",
    );
    expect(updateSubscriptionAuthority).toHaveBeenCalledTimes(1);
    expect(retrieveSubscription).toHaveBeenCalledTimes(2);
  }
});

test("POST, PUT, and DELETE restore authority only when reconciliation is definitively active", async () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    updateSubscriptionAuthority.mockClear();
    retrieveSubscription.mockReset();
    retrieveSubscription
      .mockResolvedValueOnce({ status: "active" })
      .mockResolvedValueOnce({ status: "active" });
    cancelSubscription.mockReset();
    cancelSubscription.mockRejectedValueOnce(new Error("cancel timed out"));

    await expect(transitionRequest(method)).rejects.toThrow("cancel timed out");
    expect(updateSubscriptionAuthority).toHaveBeenCalledTimes(2);
    expect(updateSubscriptionAuthority).toHaveBeenLastCalledWith(
      method === "POST" ? "00000000-0000-4000-8000-000000000001" : "user-1",
      expect.objectContaining({
        subscription_id: "sub_old",
        subscription_status: "PRO",
      }),
    );
  }
});

test("POST, PUT, and DELETE leave FREE authority when cancellation reconciliation is unknown", async () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    updateSubscriptionAuthority.mockClear();
    retrieveSubscription.mockReset();
    retrieveSubscription
      .mockResolvedValueOnce({ status: "active" })
      .mockRejectedValueOnce(new Error("reconciliation unavailable"));
    cancelSubscription.mockReset();
    cancelSubscription.mockRejectedValueOnce(new Error("cancel timed out"));

    await expect(transitionRequest(method)).rejects.toThrow("cancel timed out");
    expect(updateSubscriptionAuthority).toHaveBeenCalledTimes(1);
    expect(updateSubscriptionAuthority).toHaveBeenCalledWith(
      method === "POST" ? "00000000-0000-4000-8000-000000000001" : "user-1",
      expect.objectContaining({
        subscription_id: null,
        pending_cancellation_subscription_id: "sub_old",
      }),
    );
    expect(retrieveSubscription).toHaveBeenCalledTimes(2);
  }
});

test("POST, PUT, and DELETE never restore paid authority after cancellation succeeds but clearing the retry handle fails", async () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    updateSubscriptionAuthority.mockClear();
    clearPendingCancellation.mockReset();
    clearPendingCancellation.mockRejectedValueOnce(
      new Error("pending clear failed"),
    );
    retrieveSubscription.mockReset();
    retrieveSubscription.mockResolvedValue({ status: "active" });
    cancelSubscription.mockReset();
    cancelSubscription.mockResolvedValue({});

    await expect(transitionRequest(method)).rejects.toThrow(
      "pending clear failed",
    );
    expect(cancelSubscription).toHaveBeenCalledWith("sub_old");
    expect(retrieveSubscription).toHaveBeenCalledTimes(1);
    expect(updateSubscriptionAuthority).toHaveBeenCalledTimes(1);
  }
});

test("POST, PUT, and DELETE retry a durable pending cancellation after current authority was cleared", async () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    const pendingUser = {
      ...storedUser,
      subscription_id: null,
      pending_cancellation_subscription_id: "sub_pending",
      subscription_status: "FREE",
      current_period_end: null,
      plan_id: null,
    };
    selectedUser = pendingUser;
    updateSubscriptionAuthority.mockClear();
    retrieveSubscription.mockReset();
    retrieveSubscription.mockResolvedValue({ status: "active" });
    cancelSubscription.mockReset();
    cancelSubscription.mockResolvedValue({});
    if (method !== "POST") {
      requestContext = {
        supabase,
        user: { id: "user-1", role: "user", ...pendingUser },
      };
    }

    const response =
      method === "POST"
        ? await transitionRequest(method)
        : await (method === "PUT" ? PUT : DELETE)(
            new Request("https://dental.test/api/subscription", {
              method,
              body:
                method === "PUT"
                  ? JSON.stringify({ subscription_status: "FREE" })
                  : undefined,
            }),
          );

    expect(response.status).toBe(200);
    expect(retrieveSubscription).toHaveBeenCalledWith("sub_pending");
    expect(cancelSubscription).toHaveBeenCalledWith("sub_pending");
    expect(clearPendingCancellation).toHaveBeenCalledWith(
      method === "POST" ? "00000000-0000-4000-8000-000000000001" : "user-1",
      "sub_pending",
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
