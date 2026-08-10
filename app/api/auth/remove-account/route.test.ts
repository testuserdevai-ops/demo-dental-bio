import { beforeEach, describe, expect, mock, test } from "bun:test";

const OWNER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ID = "00000000-0000-4000-8000-000000000002";

let requestContext: unknown;
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, requestContext),
}));

const operationOrder: string[] = [];
const stripeDeleteCustomer = mock(async (_customerId: string) => {
  operationOrder.push("stripe");
});
mock.module("stripe", () => ({
  default: class StripeMock {
    customers = { del: stripeDeleteCustomer };
  },
}));

const deleteAuthUserById = mock(async (_userId: string) => {
  operationOrder.push("auth");
});
mock.module("@/lib/auth/account-authority-repository", () => ({
  deleteAuthUserById,
}));

const getUser = mock(
  async (): Promise<{
    data: { user: { id: string } | null };
    error: Error | null;
  }> => ({ data: { user: { id: OWNER_ID } }, error: null }),
);
const customerSingle = mock(
  async (): Promise<{
    data: { customer_id: string | null } | null;
    error: Error | null;
  }> => ({ data: { customer_id: null }, error: null }),
);
const customerEq = mock(() => ({ single: customerSingle }));
const customerSelect = mock(() => ({ eq: customerEq }));
const from = mock(() => ({ select: customerSelect }));

const { POST } = await import("./route");

function removeAccount(id: string) {
  return POST(
    new Request("https://dental.test/api/auth/remove-account", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  );
}

beforeEach(() => {
  operationOrder.length = 0;
  getUser.mockReset();
  getUser.mockResolvedValue({
    data: { user: { id: OWNER_ID } },
    error: null,
  });
  customerSingle.mockReset();
  customerSingle.mockResolvedValue({
    data: { customer_id: null },
    error: null,
  });
  from.mockClear();
  customerSelect.mockClear();
  customerEq.mockClear();
  stripeDeleteCustomer.mockReset();
  stripeDeleteCustomer.mockImplementation(async () => {
    operationOrder.push("stripe");
  });
  deleteAuthUserById.mockReset();
  deleteAuthUserById.mockImplementation(async () => {
    operationOrder.push("auth");
  });
  requestContext = {
    supabase: { auth: { getUser }, from },
    user: { id: OWNER_ID },
  };
});

describe("POST /api/auth/remove-account", () => {
  test("rejects a cross-user request before customer or authority operations", async () => {
    const response = await removeAccount(OTHER_ID);

    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
    expect(stripeDeleteCustomer).not.toHaveBeenCalled();
    expect(deleteAuthUserById).not.toHaveBeenCalled();
  });

  test("deletes the exact verified auth user ID", async () => {
    const response = await removeAccount(OWNER_ID);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "success" });
    expect(customerEq).toHaveBeenCalledWith("id", OWNER_ID);
    expect(deleteAuthUserById).toHaveBeenCalledWith(OWNER_ID);
  });

  test("preserves provider deletion before exact auth deletion", async () => {
    customerSingle.mockResolvedValueOnce({
      data: { customer_id: "cus_owner" },
      error: null,
    });

    const response = await removeAccount(OWNER_ID);

    expect(response.status).toBe(200);
    expect(stripeDeleteCustomer).toHaveBeenCalledWith("cus_owner");
    expect(deleteAuthUserById).toHaveBeenCalledWith(OWNER_ID);
    expect(operationOrder).toEqual(["stripe", "auth"]);
  });

  test("returns the bounded auth deletion failure without provider details", async () => {
    deleteAuthUserById.mockRejectedValueOnce(
      new Error("Auth user deletion failed"),
    );

    const response = await removeAccount(OWNER_ID);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Auth user deletion failed",
    });
    expect(deleteAuthUserById).toHaveBeenCalledWith(OWNER_ID);
  });

  test("requires a verified auth user before account operations", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("not authenticated"),
    });

    const response = await removeAccount(OWNER_ID);

    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
    expect(deleteAuthUserById).not.toHaveBeenCalled();
  });
});
