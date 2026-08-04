import { beforeEach, expect, mock, test } from "bun:test";

let requestContext: unknown;
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, requestContext),
}));

const setCustomDomainAuthority = mock(async () => undefined);
const setCustomDomainVerification = mock(async () => undefined);
mock.module("@/lib/dashboard/authority-write", () => ({
  setCustomDomainAuthority,
  setCustomDomainVerification,
}));

const removeDomainFromProject = mock(async () => ({}));
const addDomainToProject = mock(async () => ({}));
mock.module("@/lib/vercel", () => ({
  removeDomainFromProject,
  addDomainToProject,
  getVercelDomainConfig: mock(async () => ({})),
  getProjectDomain: mock(async () => ({})),
  verifyProjectDomain: mock(async () => ({})),
}));

mock.module("@/lib/customDomain", () => ({
  normalizeDomain: (value: string) => value,
  isApexDomain: () => true,
  VERCEL_A_RECORD_IP: "76.76.21.21",
  VERCEL_CNAME_TARGET: "cname.vercel-dns.com",
}));

const supabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: { domain: "owner.example" },
          error: null,
        }),
        neq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  }),
};

const { DELETE, POST } = await import("./route");

beforeEach(() => {
  requestContext = {
    supabase,
    user: { id: "user-1", subscription_status: "PREMIUM PRO", role: "user" },
  };
  removeDomainFromProject.mockClear();
  addDomainToProject.mockClear();
  setCustomDomainAuthority.mockClear();
  removeDomainFromProject.mockResolvedValue({});
  addDomainToProject.mockResolvedValue({});
  setCustomDomainAuthority.mockResolvedValue(undefined);
});

test("domain delete keeps DB authority when provider removal fails", async () => {
  removeDomainFromProject.mockResolvedValueOnce({
    error: { message: "provider unavailable" },
  });

  const response = await DELETE(
    new Request("https://dental.test/api/user/domain", { method: "DELETE" }),
  );

  expect(response.status).toBe(502);
  expect(setCustomDomainAuthority).not.toHaveBeenCalled();
});

test("domain delete restores the provider registration when DB clearing fails", async () => {
  setCustomDomainAuthority.mockRejectedValueOnce(new Error("database failed"));

  const response = await DELETE(
    new Request("https://dental.test/api/user/domain", { method: "DELETE" }),
  );

  expect(response.status).toBe(500);
  expect(addDomainToProject).toHaveBeenCalledWith("owner.example");
});

test("domain claim uses the compensated service boundary for a Premium Pro owner", async () => {
  const response = await POST(
    new Request("https://dental.test/api/user/domain", {
      method: "POST",
      body: JSON.stringify({ domain: "verified-owner.example" }),
    }),
  );

  expect(response.status).toBe(200);
  expect(addDomainToProject).toHaveBeenCalledWith("verified-owner.example");
  expect(setCustomDomainAuthority).toHaveBeenCalledWith(
    "user-1",
    "verified-owner.example",
    false,
  );
});

test("domain claim rejects a non-Premium owner before provider or authority writes", async () => {
  requestContext = {
    supabase,
    user: { id: "user-1", subscription_status: "PRO", role: "user" },
  };

  const response = await POST(
    new Request("https://dental.test/api/user/domain", {
      method: "POST",
      body: JSON.stringify({ domain: "denied-owner.example" }),
    }),
  );

  expect(response.status).toBe(403);
  expect(addDomainToProject).not.toHaveBeenCalled();
  expect(setCustomDomainAuthority).not.toHaveBeenCalled();
});
