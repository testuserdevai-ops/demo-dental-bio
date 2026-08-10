import { expect, mock, test } from "bun:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "local-anon-key";

const fetchMock = mock(async (_input: RequestInfo | URL, _init?: RequestInit) =>
  Response.json([{ username: "verified-owner" }]),
);
globalThis.fetch = fetchMock as unknown as typeof fetch;

const { lookupUsernameByDomain } = await import("./lookupDomainUser");

test("custom-domain lookup resolves only a verified mapping", async () => {
  await expect(lookupUsernameByDomain("verified-owner.example")).resolves.toBe(
    "verified-owner",
  );

  const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
  expect(requestedUrl).toContain("/rest/v1/public_profiles");
  expect(requestedUrl).toContain("verified_domain=eq.verified-owner.example");
  expect(requestedUrl).not.toContain("/rest/v1/users");
});
