import { beforeEach, expect, mock, test } from "bun:test";

let requestContext: unknown;
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, requestContext),
}));

const setDentalBrandAuthority = mock(async () => ({
  id: "user-1",
  use_dental_brand: false,
}));
mock.module("@/lib/dashboard/authority-write", () => ({
  setDentalBrandAuthority,
}));
mock.module("stripe", () => ({
  default: class StripeMock {
    customers = { del: mock(async () => undefined) };
  },
}));
mock.module("@/utils/user/getUserIdByEmail", () => ({
  getUserIdByEmail: mock(async () => "user-1"),
}));
mock.module("@/utils/supabase/supabaseAdmin", () => ({
  default: { auth: { admin: { deleteUser: mock(async () => ({})) } } },
}));

const forbiddenSupabase = {
  from: () => {
    throw new Error("branding must not use the caller's direct users grant");
  },
};

const { PUT } = await import("./route");

beforeEach(() => {
  requestContext = {
    supabase: forbiddenSupabase,
    user: {
      id: "user-1",
      role: "user",
      subscription_status: "PREMIUM PRO",
    },
  };
  setDentalBrandAuthority.mockReset();
  setDentalBrandAuthority.mockResolvedValue({
    id: "user-1",
    use_dental_brand: false,
  });
});

test("Premium Pro branding changes use the controlled server authority", async () => {
  const response = await PUT(
    new Request("https://dental.test/api/user", {
      method: "PUT",
      body: JSON.stringify({ use_dental_brand: false }),
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    id: "user-1",
    use_dental_brand: false,
  });
  expect(setDentalBrandAuthority).toHaveBeenCalledWith("user-1", false);
});

test("non-Premium branding changes fail before the controlled authority", async () => {
  requestContext = {
    supabase: forbiddenSupabase,
    user: { id: "user-1", role: "user", subscription_status: "PRO" },
  };

  const response = await PUT(
    new Request("https://dental.test/api/user", {
      method: "PUT",
      body: JSON.stringify({ use_dental_brand: false }),
    }),
  );

  expect(response.status).not.toBe(200);
  expect(setDentalBrandAuthority).not.toHaveBeenCalled();
});

test("branding rejects malformed values before the controlled authority", async () => {
  const response = await PUT(
    new Request("https://dental.test/api/user", {
      method: "PUT",
      body: JSON.stringify({ use_dental_brand: "false" }),
    }),
  );

  expect(response.status).toBe(400);
  expect(setDentalBrandAuthority).not.toHaveBeenCalled();
});
