import { beforeEach, describe, expect, it, mock } from "bun:test";

let requestContext: unknown = { supabase: {}, user: { id: "owner" } };
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, requestContext),
}));

const getEffectiveUserId = mock(async (): Promise<string | null> => "owner");
const getSubscriptionOverview = mock(async () => ({
  customerId: null,
  plan: { planName: "FREE" },
  paymentMethods: { items: [], error: null },
  billingHistory: {
    invoices: [],
    hasMore: false,
    nextCursor: null,
    error: null,
  },
}));
mock.module("@/utils/user/getEffectiveUserId", () => ({ getEffectiveUserId }));
mock.module("@/lib/subscription/overview", () => ({
  getSubscriptionOverview,
}));

const { GET } = await import("./route");

beforeEach(() => {
  requestContext = { supabase: {}, user: { id: "owner" } };
  getEffectiveUserId.mockReset();
  getEffectiveUserId.mockResolvedValue("owner");
  getSubscriptionOverview.mockClear();
});

describe("GET /api/subscription/overview", () => {
  it("resolves the authenticated owner and returns the canonical overview", async () => {
    const response = await GET(
      new Request("https://dental.test/api/subscription/overview"),
    );

    expect(response.status).toBe(200);
    expect(getEffectiveUserId).toHaveBeenCalledWith({ supabase: {} });
    expect(getSubscriptionOverview).toHaveBeenCalledWith("owner");
  });

  it("does not invoke providers without an effective authenticated user", async () => {
    getEffectiveUserId.mockResolvedValue(null);
    const response = await GET(
      new Request("https://dental.test/api/subscription/overview"),
    );

    expect(response.status).toBe(401);
    expect(getSubscriptionOverview).not.toHaveBeenCalled();
  });
});
