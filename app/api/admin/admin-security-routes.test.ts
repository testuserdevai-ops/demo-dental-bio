import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const { authorizeAdminActor } = await import("@/lib/admin/authorization");
type Actor = Parameters<typeof authorizeAdminActor>[0];
type Capability = Parameters<typeof authorizeAdminActor>[1];

let actor: Actor = null;
const capabilities: Capability[] = [];
const revalidatePublicProfileIdentityCache = mock(
  (_usernames: readonly (string | null | undefined)[]) => undefined,
);

mock.module("@/lib/public-profile/cache-revalidation", () => ({
  revalidatePublicProfileIdentityCache,
}));

mock.module("@/lib/admin/http", () => ({
  withAdminAuthorization:
    (
      capability: Capability,
      handler: (
        request: Request,
        context: { actor: { id: string; role: "admin" | "security_admin" } },
      ) => Promise<Response>,
    ) =>
    async (request: Request) => {
      capabilities.push(capability);
      let authorized;
      try {
        authorized = authorizeAdminActor(actor, capability);
      } catch {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      return handler(request, { actor: authorized });
    },
}));

const repository = {
  listBlockedDomains: mock(async () => ({ data: [], count: 0 })),
  addBlockedDomain: mock(async () => ({ id: 1, domain: "example.test" })),
  setBlockedDomainActive: mock(async () => ({ id: 1, is_active: true })),
  removeBlockedDomain: mock(async () => undefined),
  listBlockedFingerprints: mock(async () => ({ data: [], count: 0 })),
  addBlockedFingerprint: mock(async () => ({ id: 1, fingerprint: "fp" })),
  removeBlockedFingerprint: mock(async () => undefined),
  listBlockedIps: mock(async () => ({ data: [], count: 0 })),
  addBlockedIp: mock(async () => ({ id: 1, ip_address: "127.0.0.1" })),
  removeBlockedIp: mock(async () => undefined),
  listBlockedUsers: mock(async () => ({ data: [], count: 0 })),
  blockUser: mock(async () => ({
    id: "00000000-0000-4000-8000-000000000010",
    username: "blocked-owner",
  })),
  unblockUser: mock(async () => ({
    id: "00000000-0000-4000-8000-000000000010",
    username: "blocked-owner",
  })),
  listSecurityLogs: mock(async () => ({ data: [], count: 0 })),
  listProfileAuditLog: mock(async () => ({ data: [], count: 0 })),
  listSecurityUsers: mock(async () => ({ data: [], count: 0 })),
  listAdminUsers: mock(async () => ({ data: [], count: 0 })),
  listUsersForAdmin: mock(async () => []),
};
mock.module("@/lib/admin/security-repository", () => ({
  ...repository,
  AdminRepositoryError: class AdminRepositoryError extends Error {},
}));
const marketingRepository = {
  listSuppressedMarketingEmails: mock(async () => [] as string[]),
};
const sendMarketingEmail = mock(async () => ({
  sent: 1,
  failed: 0,
  errors: [] as string[],
}));
mock.module("@/lib/admin/marketing-repository", () => marketingRepository);
mock.module("@/utils/domainConfig", () => ({
  getAllBrands: () => [{ domain: "dental.bio" }],
  getDomainConfigByHostname: () => ({ domain: "dental.bio" }),
}));
mock.module("@/utils/mails/sendMarketingEmail", () => ({ sendMarketingEmail }));
mock.module("@/utils/marketing/unsubscribeToken", () => ({
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
}));

const domains = await import("./blocked-domains/route");
const fingerprints = await import("./blocked-fingerprints/route");
const ips = await import("./blocked-ips/route");
const users = await import("./blocked-users/route");
const logs = await import("./security-logs/route");
const audit = await import("./profile-audit-log/route");
const userList = await import("../user/list/route");
const marketing = await import("./marketing/send/route");

const admin = {
  id: "00000000-0000-4000-8000-000000000001",
  role: "admin",
  isBlocked: false,
} as const;
const securityAdmin = { ...admin, role: "security_admin" as const };
const ordinary = { ...admin, role: "user" };
const blocked = { ...admin, isBlocked: true };

function request(url: string, body?: unknown) {
  return new Request(url, {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  actor = null;
  capabilities.length = 0;
  for (const value of Object.values(repository)) value.mockReset();
  marketingRepository.listSuppressedMarketingEmails.mockReset();
  sendMarketingEmail.mockReset();
  repository.listBlockedDomains.mockResolvedValue({ data: [], count: 0 });
  repository.listBlockedFingerprints.mockResolvedValue({ data: [], count: 0 });
  repository.listBlockedIps.mockResolvedValue({ data: [], count: 0 });
  repository.listBlockedUsers.mockResolvedValue({ data: [], count: 0 });
  repository.listSecurityLogs.mockResolvedValue({ data: [], count: 0 });
  repository.listProfileAuditLog.mockResolvedValue({ data: [], count: 0 });
  repository.listSecurityUsers.mockResolvedValue({ data: [], count: 0 });
  repository.listAdminUsers.mockResolvedValue({ data: [], count: 0 });
  repository.listUsersForAdmin.mockResolvedValue([]);
  marketingRepository.listSuppressedMarketingEmails.mockResolvedValue([]);
  sendMarketingEmail.mockResolvedValue({ sent: 1, failed: 0, errors: [] });
  repository.addBlockedDomain.mockResolvedValue({
    id: 1,
    domain: "example.test",
  });
  repository.addBlockedFingerprint.mockResolvedValue({
    id: 1,
    fingerprint: "device-fingerprint",
  });
  repository.addBlockedIp.mockResolvedValue({ id: 1, ip_address: "127.0.0.1" });
  repository.blockUser.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000010",
    username: "blocked-owner",
  });
  repository.unblockUser.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000010",
    username: "blocked-owner",
  });
  revalidatePublicProfileIdentityCache.mockClear();
});

describe("admin/security route authorization", () => {
  const securityReadRoutes = [
    [
      "blocked domains",
      () =>
        domains.GET(request("https://dental.test/api/admin/blocked-domains")),
    ],
    [
      "blocked fingerprints",
      () =>
        fingerprints.GET(
          request("https://dental.test/api/admin/blocked-fingerprints"),
        ),
    ],
    [
      "blocked IPs",
      () => ips.GET(request("https://dental.test/api/admin/blocked-ips")),
    ],
    [
      "blocked users",
      () => users.GET(request("https://dental.test/api/admin/blocked-users")),
    ],
    [
      "security logs",
      () => logs.GET(request("https://dental.test/api/admin/security-logs")),
    ],
  ] as const;

  for (const [name, invoke] of securityReadRoutes) {
    test(`${name} rejects anonymous, ordinary, and blocked actors but permits security-admin reads`, async () => {
      for (const candidate of [null, ordinary, blocked]) {
        actor = candidate;
        expect((await invoke()).status).toBe(403);
      }
      actor = securityAdmin;
      expect((await invoke()).status).toBe(200);
      actor = admin;
      expect((await invoke()).status).toBe(200);
      expect(capabilities).toContain("security:read");
    });
  }

  const securityMutations = [
    [
      "blocked domains",
      () =>
        domains.POST(
          request("https://dental.test/api/admin/blocked-domains", {
            domain: "example.test",
          }),
        ),
    ],
    [
      "blocked fingerprints",
      () =>
        fingerprints.POST(
          request("https://dental.test/api/admin/blocked-fingerprints", {
            fingerprint: "device-fingerprint",
          }),
        ),
    ],
    [
      "blocked IPs",
      () =>
        ips.POST(
          request("https://dental.test/api/admin/blocked-ips", {
            ip_address: "127.0.0.1",
          }),
        ),
    ],
    [
      "blocked users",
      () =>
        users.POST(
          request("https://dental.test/api/admin/blocked-users", {
            user_id: "00000000-0000-4000-8000-000000000010",
          }),
        ),
    ],
  ] as const;

  for (const [name, invoke] of securityMutations) {
    test(`${name} mutations reject security-admin and blocked actors`, async () => {
      for (const candidate of [null, ordinary, blocked, securityAdmin]) {
        actor = candidate;
        expect((await invoke()).status).toBe(403);
      }
      actor = admin;
      expect((await invoke()).status).toBe(200);
      expect(capabilities).toContain("security:manage");
    });
  }

  test("audit log permits only unblocked security administrators and admins", async () => {
    for (const candidate of [null, ordinary, blocked]) {
      actor = candidate;
      expect(
        (
          await audit.GET(
            request("https://dental.test/api/admin/profile-audit-log"),
          )
        ).status,
      ).toBe(403);
    }
    actor = securityAdmin;
    expect(
      (
        await audit.GET(
          request("https://dental.test/api/admin/profile-audit-log"),
        )
      ).status,
    ).toBe(200);
    actor = admin;
    expect(
      (
        await audit.GET(
          request("https://dental.test/api/admin/profile-audit-log"),
        )
      ).status,
    ).toBe(200);
    expect(capabilities).toContain("security:audit:read");
  });

  test("security-user POST permits read-only security administrators, while GET is admin-only", async () => {
    const post = () =>
      userList.POST(
        request("https://dental.test/api/user/list", {
          page: 1,
          limit: 25,
          filters: {},
        }),
      );
    for (const candidate of [null, ordinary, blocked]) {
      actor = candidate;
      expect((await post()).status).toBe(403);
    }
    actor = securityAdmin;
    expect((await post()).status).toBe(200);
    expect(repository.listSecurityUsers).toHaveBeenCalledTimes(1);
    expect(repository.listAdminUsers).not.toHaveBeenCalled();
    expect(
      (await userList.GET(request("https://dental.test/api/user/list"))).status,
    ).toBe(403);
    actor = admin;
    expect((await post()).status).toBe(200);
    expect(repository.listAdminUsers).toHaveBeenCalledTimes(1);
    expect(
      (await userList.GET(request("https://dental.test/api/user/list"))).status,
    ).toBe(200);
    expect(capabilities).toContain("security:users:read");
    expect(capabilities).toContain("users:manage");
  });

  test("forwards controlled directory search and sorting to the authorized repository", async () => {
    actor = admin;

    expect(
      (
        await userList.POST(
          request("https://dental.test/api/user/list", {
            page: 3,
            limit: 20,
            search: "Amelia",
            sort: "identity",
            direction: "asc",
            filters: { country: "United Kingdom" },
          }),
        )
      ).status,
    ).toBe(200);
    expect(repository.listAdminUsers).toHaveBeenCalledWith(
      { page: 3, limit: 20 },
      {
        email: undefined,
        username: undefined,
        firstName: undefined,
        middleName: undefined,
        lastName: undefined,
        country: "United Kingdom",
        isVerified: undefined,
        subscriptionStatus: undefined,
      },
      { search: "Amelia", sort: "identity", direction: "asc" },
    );
  });

  test("strict parsing rejects invalid inputs before a repository call", async () => {
    actor = admin;
    expect(
      (
        await domains.POST(
          request("https://dental.test/api/admin/blocked-domains", {
            domain: "not a domain",
          }),
        )
      ).status,
    ).toBe(400);
    expect(repository.addBlockedDomain).not.toHaveBeenCalled();

    expect(
      (
        await userList.POST(
          request("https://dental.test/api/user/list", {
            page: 0,
            limit: 10_000,
            filters: { unknown: "nope" },
          }),
        )
      ).status,
    ).toBe(400);
    expect(repository.listSecurityUsers).not.toHaveBeenCalled();
  });

  test("blocking and unblocking expire the affected public identity", async () => {
    actor = admin;

    expect(
      (
        await users.POST(
          request("https://dental.test/api/admin/blocked-users", {
            user_id: "00000000-0000-4000-8000-000000000010",
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await users.DELETE(
          request("https://dental.test/api/admin/blocked-users", {
            user_id: "00000000-0000-4000-8000-000000000010",
          }),
        )
      ).status,
    ).toBe(200);
    expect(revalidatePublicProfileIdentityCache).toHaveBeenNthCalledWith(1, [
      "blocked-owner",
    ]);
    expect(revalidatePublicProfileIdentityCache).toHaveBeenNthCalledWith(2, [
      "blocked-owner",
    ]);
  });

  test("preserves the security dashboard reference fetch and cleared filters", async () => {
    actor = securityAdmin;
    expect(
      (
        await fingerprints.GET(
          request(
            "https://dental.test/api/admin/blocked-fingerprints?page=1&limit=10000",
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await userList.POST(
          request("https://dental.test/api/user/list", {
            page: 1,
            limit: 25,
            filters: { email: "" },
          }),
        )
      ).status,
    ).toBe(200);
  });

  test("bounds and strictly validates marketing campaigns before provider use", async () => {
    actor = admin;
    const validRecipient = { email: "person@example.test" };
    for (const invalidBody of [
      {
        subject: "Hello",
        bodyHtml: "<p>Campaign</p>",
        brandDomain: "uncontrolled.example",
        recipients: [validRecipient],
      },
      {
        subject: "Hello",
        bodyHtml: "<p>Campaign</p>",
        recipients: [validRecipient],
        unexpected: true,
      },
      {
        subject: "Hello",
        bodyHtml: "<p>Campaign</p>",
        recipients: Array.from({ length: 5_001 }, () => validRecipient),
      },
    ]) {
      expect(
        (
          await marketing.POST(
            request(
              "https://dental.test/api/admin/marketing/send",
              invalidBody,
            ),
          )
        ).status,
      ).toBe(400);
    }
    expect(sendMarketingEmail).not.toHaveBeenCalled();
    expect(
      (
        await marketing.POST(
          request("https://dental.test/api/admin/marketing/send", {
            subject: "Hello",
            bodyHtml: "<p>Campaign</p>",
            brandDomain: "dental.bio",
            recipients: [validRecipient],
          }),
        )
      ).status,
    ).toBe(200);
    expect(sendMarketingEmail).toHaveBeenCalledTimes(1);
  });
});
