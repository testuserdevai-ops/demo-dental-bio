import { beforeEach, expect, mock, test } from "bun:test";

let requestContext: unknown;
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, requestContext),
}));

type Authority = {
  user_id: string;
  subscription_id: string | null;
  pending_subscription_id: string | null;
  subscription_status: "FREE" | "PRO" | "PREMIUM PRO";
  current_period_end: string | null;
  plan_id: string | null;
  trial_end: string | null;
  billing_cycle: "monthly" | "annually";
};

const paidAuthority: Authority = {
  user_id: "user-1",
  subscription_id: "sub_old",
  pending_subscription_id: null,
  subscription_status: "PRO",
  current_period_end: "2026-09-01T00:00:00.000Z",
  plan_id: "price_old",
  trial_end: null,
  billing_cycle: "monthly",
};

const getSubscriptionAuthorityForUser = mock(async () => paidAuthority);
const beginSubscriptionCancellation = mock(async () => ({
  result: "begun" as "begun" | "retry" | "none" | "conflict",
  subscription_id: "sub_old" as string | null,
}));
const finishSubscriptionCancellation = mock(
  async () => "cleared" as "cleared" | "restored" | "noop",
);
const updateSubscriptionAuthority = mock(async () => undefined);
const clearPendingCancellation = mock(async () => undefined);
mock.module("@/lib/dashboard/authority-write", () => ({
  getSubscriptionAuthorityForUser,
  beginSubscriptionCancellation,
  finishSubscriptionCancellation,
  updateSubscriptionAuthority,
  clearPendingCancellation,
}));

const retrieveSubscription = mock(async () => ({ status: "active" }));
const cancelSubscription = mock(async (_subscriptionId: string) => ({}));
mock.module("stripe", () => ({
  default: class StripeMock {
    subscriptions = {
      retrieve: retrieveSubscription,
      cancel: cancelSubscription,
    };
  },
}));

const supabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: paidAuthority, error: null }),
      }),
    }),
  }),
};

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

function ownerRequest(method: "PUT" | "DELETE", authority = paidAuthority) {
  requestContext = {
    supabase,
    user: {
      id: "user-1",
      role: "user",
      subscription_id: authority.subscription_id,
      subscription_status: authority.subscription_status,
      current_period_end: authority.current_period_end,
      plan_id: authority.plan_id,
      trial_end: authority.trial_end,
      billing_cycle: authority.billing_cycle,
    },
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
  getSubscriptionAuthorityForUser.mockReset();
  getSubscriptionAuthorityForUser.mockResolvedValue(paidAuthority);
  beginSubscriptionCancellation.mockReset();
  beginSubscriptionCancellation.mockResolvedValue({
    result: "begun",
    subscription_id: "sub_old",
  });
  finishSubscriptionCancellation.mockReset();
  finishSubscriptionCancellation.mockResolvedValue("cleared");
  updateSubscriptionAuthority.mockClear();
  clearPendingCancellation.mockClear();
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
  expect(beginSubscriptionCancellation).not.toHaveBeenCalled();
  expect(retrieveSubscription).not.toHaveBeenCalled();
});

test("POST, PUT, and DELETE atomically begin cancellation before Stripe", async () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    beginSubscriptionCancellation.mockClear();
    finishSubscriptionCancellation.mockClear();
    retrieveSubscription.mockClear();
    cancelSubscription.mockClear();

    expect((await transitionRequest(method)).status).toBe(200);
    expect(beginSubscriptionCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId:
          method === "POST" ? "00000000-0000-4000-8000-000000000001" : "user-1",
        expectedSubscriptionId: "sub_old",
        expectedPendingSubscriptionId: null,
        subscriptionStatus: "FREE",
      }),
    );
    expect(cancelSubscription).toHaveBeenCalledWith("sub_old");
    expect(finishSubscriptionCancellation).toHaveBeenCalledWith(
      method === "POST" ? "00000000-0000-4000-8000-000000000001" : "user-1",
      "sub_old",
      "confirmed",
    );
  }
});

test("POST, PUT, and DELETE skip Stripe when atomic initiation fails", async () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    beginSubscriptionCancellation.mockRejectedValueOnce(
      new Error("database failed"),
    );
    await expect(transitionRequest(method)).rejects.toThrow("database failed");
    expect(retrieveSubscription).not.toHaveBeenCalled();
    expect(cancelSubscription).not.toHaveBeenCalled();
  }
});

test("POST, PUT, and DELETE clear pending after a timed-out cancellation reconciles terminal", async () => {
  for (const terminalStatus of ["canceled", "incomplete_expired"] as const) {
    for (const method of ["POST", "PUT", "DELETE"] as const) {
      finishSubscriptionCancellation.mockClear();
      retrieveSubscription.mockReset();
      retrieveSubscription
        .mockResolvedValueOnce({ status: "active" })
        .mockResolvedValueOnce({ status: terminalStatus });
      cancelSubscription.mockRejectedValueOnce(new Error("cancel timed out"));

      await expect(transitionRequest(method)).rejects.toThrow(
        "cancel timed out",
      );
      expect(finishSubscriptionCancellation).toHaveBeenCalledWith(
        method === "POST" ? "00000000-0000-4000-8000-000000000001" : "user-1",
        "sub_old",
        "confirmed",
      );
      expect(finishSubscriptionCancellation).not.toHaveBeenCalledWith(
        expect.anything(),
        "sub_old",
        "restore",
      );
    }
  }
});

test("POST, PUT, and DELETE confirm terminal subscriptions without canceling or restoring", async () => {
  for (const terminalStatus of ["canceled", "incomplete_expired"] as const) {
    for (const method of ["POST", "PUT", "DELETE"] as const) {
      retrieveSubscription.mockReset();
      retrieveSubscription.mockResolvedValueOnce({ status: terminalStatus });
      cancelSubscription.mockClear();
      finishSubscriptionCancellation.mockClear();

      expect((await transitionRequest(method)).status).toBe(200);
      expect(cancelSubscription).not.toHaveBeenCalled();
      expect(finishSubscriptionCancellation).toHaveBeenCalledWith(
        method === "POST" ? "00000000-0000-4000-8000-000000000001" : "user-1",
        "sub_old",
        "confirmed",
      );
      expect(finishSubscriptionCancellation).not.toHaveBeenCalledWith(
        expect.anything(),
        "sub_old",
        "restore",
      );
    }
  }
});

test("POST, PUT, and DELETE restore only through the exact pending CAS", async () => {
  for (const result of ["restored", "noop"] as const) {
    for (const method of ["POST", "PUT", "DELETE"] as const) {
      finishSubscriptionCancellation.mockReset();
      finishSubscriptionCancellation.mockResolvedValue(result);
      retrieveSubscription.mockReset();
      retrieveSubscription
        .mockResolvedValueOnce({ status: "active" })
        .mockResolvedValueOnce({ status: "active" });
      cancelSubscription.mockRejectedValueOnce(new Error("cancel timed out"));

      await expect(transitionRequest(method)).rejects.toThrow(
        "cancel timed out",
      );
      expect(finishSubscriptionCancellation).toHaveBeenCalledWith(
        method === "POST" ? "00000000-0000-4000-8000-000000000001" : "user-1",
        "sub_old",
        "restore",
      );
      expect(updateSubscriptionAuthority).not.toHaveBeenCalled();
    }
  }
});

test("POST, PUT, and DELETE retain pending state when reconciliation is unknown", async () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    finishSubscriptionCancellation.mockClear();
    retrieveSubscription.mockReset();
    retrieveSubscription
      .mockResolvedValueOnce({ status: "active" })
      .mockRejectedValueOnce(new Error("reconciliation unavailable"));
    cancelSubscription.mockRejectedValueOnce(new Error("cancel timed out"));

    await expect(transitionRequest(method)).rejects.toThrow("cancel timed out");
    expect(finishSubscriptionCancellation).not.toHaveBeenCalled();
  }
});

test("POST, PUT, and DELETE retry private pending cancellation after public authority is FREE", async () => {
  const pendingAuthority: Authority = {
    ...paidAuthority,
    subscription_id: null,
    pending_subscription_id: "sub_pending",
    subscription_status: "FREE",
    current_period_end: null,
    plan_id: null,
  };
  getSubscriptionAuthorityForUser.mockResolvedValue(pendingAuthority);
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    beginSubscriptionCancellation.mockReset();
    beginSubscriptionCancellation
      .mockResolvedValueOnce({
        result: "retry",
        subscription_id: "sub_pending",
      })
      .mockResolvedValueOnce({ result: "none", subscription_id: null });
    cancelSubscription.mockClear();
    const response =
      method === "POST"
        ? await transitionRequest(method)
        : await ownerRequest(method, pendingAuthority);
    expect(response.status).toBe(200);
    expect(cancelSubscription).toHaveBeenCalledWith("sub_pending");
  }
});

test("POST, PUT, and DELETE finish an old pending cancellation before transitioning newer authority", async () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    beginSubscriptionCancellation.mockReset();
    beginSubscriptionCancellation
      .mockResolvedValueOnce({
        result: "retry",
        subscription_id: "sub_old_pending",
      })
      .mockResolvedValueOnce({
        result: "begun",
        subscription_id: "sub_current",
      });
    cancelSubscription.mockClear();
    finishSubscriptionCancellation.mockClear();

    expect((await transitionRequest(method)).status).toBe(200);
    expect(cancelSubscription.mock.calls.map(([id]) => id)).toEqual([
      "sub_old_pending",
      "sub_current",
    ]);
    expect(finishSubscriptionCancellation).toHaveBeenCalledTimes(2);
  }
});

test("successful provider cancellation keeps a retryable row when atomic clear fails", async () => {
  for (const method of ["POST", "PUT", "DELETE"] as const) {
    finishSubscriptionCancellation.mockRejectedValueOnce(
      new Error("pending clear failed"),
    );
    retrieveSubscription.mockClear();
    cancelSubscription.mockResolvedValueOnce({});

    await expect(transitionRequest(method)).rejects.toThrow(
      "pending clear failed",
    );
    expect(retrieveSubscription).toHaveBeenCalledTimes(1);
    expect(updateSubscriptionAuthority).not.toHaveBeenCalled();
  }
});

test("owner PUT rejects extra subscription authority input", async () => {
  requestContext = {
    supabase,
    user: { id: "user-1", role: "user", ...paidAuthority },
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
  expect(beginSubscriptionCancellation).not.toHaveBeenCalled();
});
