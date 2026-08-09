import { beforeEach, describe, expect, mock, test } from "bun:test";

const OWNER_ID = "00000000-0000-4000-8000-000000000001";
const TARGET_ID = "00000000-0000-4000-8000-000000000002";
const MISSING_TARGET_ID = "00000000-0000-4000-8000-000000000003";
const ZERO_ID = "00000000-0000-0000-0000-000000000000";

let requestContext: unknown;
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, requestContext),
}));

const getDentalBrandEntitlementAuthority = mock(
  async (
    userId: string,
  ): Promise<{
    id: string;
    subscription_status: "FREE" | "PRO" | "PREMIUM PRO" | null;
  } | null> =>
    userId === MISSING_TARGET_ID || userId === ZERO_ID
      ? null
      : {
          id: userId,
          subscription_status: "PREMIUM PRO",
        },
);
const setDentalBrandAuthority = mock(async (userId: string) => ({
  id: userId,
  use_dental_brand: false,
}));
mock.module("@/lib/dashboard/authority-write", () => ({
  getDentalBrandEntitlementAuthority,
  setDentalBrandAuthority,
}));
mock.module("stripe", () => ({
  default: class StripeMock {
    customers = { del: stripeDeleteCustomer };
  },
}));
const stripeDeleteCustomer = mock(async () => undefined);
const deleteAuthUserForAdmin = mock(async () => undefined);
mock.module("@/lib/admin/user-deletion-repository", () => ({
  deleteAuthUserForAdmin,
}));

const forbiddenSupabase = {
  from: () => {
    throw new Error("branding must not use the caller's direct users grant");
  },
};

const { DELETE, PUT } = await import("./route");

function putBranding(body: string | object) {
  return PUT(
    new Request("https://dental.test/api/user", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  requestContext = {
    supabase: forbiddenSupabase,
    user: {
      id: OWNER_ID,
      role: "user",
      subscription_status: "PREMIUM PRO",
    },
  };
  getDentalBrandEntitlementAuthority.mockReset();
  getDentalBrandEntitlementAuthority.mockImplementation(
    async (userId: string) =>
      userId === MISSING_TARGET_ID || userId === ZERO_ID
        ? null
        : { id: userId, subscription_status: "PREMIUM PRO" },
  );
  setDentalBrandAuthority.mockReset();
  setDentalBrandAuthority.mockImplementation(async (userId: string) => ({
    id: userId,
    use_dental_brand: false,
  }));
  stripeDeleteCustomer.mockReset();
  stripeDeleteCustomer.mockResolvedValue(undefined);
  deleteAuthUserForAdmin.mockReset();
  deleteAuthUserForAdmin.mockResolvedValue(undefined);
});

describe("PUT /api/user branding authority", () => {
  test("an owner without a target is entitled and written by owner ID", async () => {
    const response = await putBranding({ use_dental_brand: false });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: OWNER_ID,
      use_dental_brand: false,
    });
    expect(getDentalBrandEntitlementAuthority).toHaveBeenCalledWith(OWNER_ID);
    expect(setDentalBrandAuthority).toHaveBeenCalledWith(OWNER_ID, false);
  });

  for (const subscriptionStatus of ["FREE", "PRO"] as const) {
    test(`an owner on ${subscriptionStatus} is denied`, async () => {
      getDentalBrandEntitlementAuthority.mockResolvedValueOnce({
        id: OWNER_ID,
        subscription_status: subscriptionStatus,
      });

      const response = await putBranding({ use_dental_brand: false });

      expect(response.status).toBe(403);
      expect(setDentalBrandAuthority).not.toHaveBeenCalled();
    });
  }

  for (const actorPlan of ["FREE", "PRO"] as const) {
    test(`an admin on ${actorPlan} can update a Premium target`, async () => {
      requestContext = {
        supabase: forbiddenSupabase,
        user: { id: OWNER_ID, role: "admin", subscription_status: actorPlan },
      };

      const response = await putBranding({
        targetUserId: TARGET_ID,
        use_dental_brand: false,
      });

      expect(response.status).toBe(200);
      expect(getDentalBrandEntitlementAuthority).toHaveBeenCalledWith(
        TARGET_ID,
      );
      expect(setDentalBrandAuthority).toHaveBeenCalledWith(TARGET_ID, false);
    });
  }

  for (const targetPlan of ["FREE", "PRO"] as const) {
    test(`a Premium admin cannot update a ${targetPlan} target`, async () => {
      requestContext = {
        supabase: forbiddenSupabase,
        user: {
          id: OWNER_ID,
          role: "admin",
          subscription_status: "PREMIUM PRO",
        },
      };
      getDentalBrandEntitlementAuthority.mockResolvedValueOnce({
        id: TARGET_ID,
        subscription_status: targetPlan,
      });

      const response = await putBranding({
        targetUserId: TARGET_ID,
        use_dental_brand: false,
      });

      expect(response.status).toBe(403);
      expect(setDentalBrandAuthority).not.toHaveBeenCalled();
    });
  }

  test("a non-admin target spoof is denied before privileged reads", async () => {
    const response = await putBranding({
      targetUserId: TARGET_ID,
      use_dental_brand: false,
    });

    expect(response.status).toBe(403);
    expect(getDentalBrandEntitlementAuthority).not.toHaveBeenCalled();
    expect(setDentalBrandAuthority).not.toHaveBeenCalled();
  });

  for (const targetUserId of [ZERO_ID, MISSING_TARGET_ID]) {
    test(`a missing target ${targetUserId} is denied without a write`, async () => {
      requestContext = {
        supabase: forbiddenSupabase,
        user: {
          id: OWNER_ID,
          role: "admin",
          subscription_status: "PREMIUM PRO",
        },
      };

      const response = await putBranding({
        targetUserId,
        use_dental_brand: false,
      });

      expect(response.status).toBe(403);
      expect(getDentalBrandEntitlementAuthority).toHaveBeenCalledWith(
        targetUserId,
      );
      expect(setDentalBrandAuthority).not.toHaveBeenCalled();
    });
  }

  test("malformed JSON is rejected before privileged calls", async () => {
    const response = await putBranding("{");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid request body" });
    expect(getDentalBrandEntitlementAuthority).not.toHaveBeenCalled();
    expect(setDentalBrandAuthority).not.toHaveBeenCalled();
  });

  test("strict DTO validation rejects malformed values before privileged calls", async () => {
    const response = await putBranding({
      use_dental_brand: "false",
      subscription_status: "PREMIUM PRO",
    });

    expect(response.status).toBe(400);
    expect(getDentalBrandEntitlementAuthority).not.toHaveBeenCalled();
    expect(setDentalBrandAuthority).not.toHaveBeenCalled();
  });
});

function deletionSupabase(
  target: { id: string; email: string; customer_id: string | null } | null,
) {
  const maybeSingle = mock(async () => ({ data: target, error: null }));
  const secondEq = mock(() => ({ maybeSingle }));
  const firstEq = mock(() => ({ eq: secondEq }));
  const select = mock(() => ({ eq: firstEq }));
  return { from: mock(() => ({ select })), select, firstEq, secondEq };
}

describe("DELETE /api/user admin target", () => {
  test("rejects ordinary users and strict invalid DTOs before target reads", async () => {
    requestContext = {
      supabase: forbiddenSupabase,
      user: { id: OWNER_ID, role: "user" },
    };
    const forbidden = await DELETE(
      new Request("https://dental.test/api/user", {
        method: "DELETE",
        body: JSON.stringify({ id: TARGET_ID, email: "target@example.test" }),
      }),
    );
    expect(forbidden.status).toBe(403);

    requestContext = {
      supabase: forbiddenSupabase,
      user: { id: OWNER_ID, role: "admin" },
    };
    const invalid = await DELETE(
      new Request("https://dental.test/api/user", {
        method: "DELETE",
        body: JSON.stringify({
          id: TARGET_ID,
          email: "target@example.test",
          role: "admin",
        }),
      }),
    );
    expect(invalid.status).toBe(400);
    expect(deleteAuthUserForAdmin).not.toHaveBeenCalled();
  });

  test("requires the immutable ID and email to resolve the same target", async () => {
    const supabase = deletionSupabase(null);
    requestContext = {
      supabase,
      user: { id: OWNER_ID, role: "admin" },
    };
    const response = await DELETE(
      new Request("https://dental.test/api/user", {
        method: "DELETE",
        body: JSON.stringify({ id: TARGET_ID, email: "target@example.test" }),
      }),
    );

    expect(response.status).toBe(404);
    expect(supabase.firstEq).toHaveBeenCalledWith("id", TARGET_ID);
    expect(supabase.secondEq).toHaveBeenCalledWith(
      "email",
      "target@example.test",
    );
    expect(stripeDeleteCustomer).not.toHaveBeenCalled();
    expect(deleteAuthUserForAdmin).not.toHaveBeenCalled();
  });

  test("deletes the resolved Stripe customer before the exact auth user", async () => {
    const supabase = deletionSupabase({
      id: TARGET_ID,
      email: "target@example.test",
      customer_id: "cus_target",
    });
    requestContext = {
      supabase,
      user: { id: OWNER_ID, role: "admin" },
    };
    const response = await DELETE(
      new Request("https://dental.test/api/user", {
        method: "DELETE",
        body: JSON.stringify({ id: TARGET_ID, email: "target@example.test" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(stripeDeleteCustomer).toHaveBeenCalledWith("cus_target");
    expect(deleteAuthUserForAdmin).toHaveBeenCalledWith(TARGET_ID);
  });
});
