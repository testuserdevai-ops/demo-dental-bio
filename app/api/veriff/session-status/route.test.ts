import { beforeEach, expect, mock, test } from "bun:test";

let requestContext: unknown;
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, requestContext),
}));

const setUserVerificationForOwnedVeriffSession = mock(async () => undefined);
mock.module("@/lib/dashboard/authority-write", () => ({
  setUserVerificationForOwnedVeriffSession,
}));

const fetchProvider = mock(async () =>
  Response.json({ verifications: [{ status: "approved" }] }),
);
globalThis.fetch = fetchProvider as unknown as typeof fetch;
process.env.VERIFF_API_KEY = "veriff-key";
process.env.VERIFF_API_URL = "https://veriff.test";
process.env.VERIFF_SHARED_SECRET = "secret";

const { GET } = await import("./route");

beforeEach(() => {
  fetchProvider.mockClear();
  setUserVerificationForOwnedVeriffSession.mockClear();
});

test("polling rejects a Veriff session that is not stored on the current user", async () => {
  requestContext = {
    user: { id: "user-1", session_id: "owned-session" },
  };

  const response = await GET(
    new Request(
      "https://dental.test/api/veriff/session-status?sessionId=other-session",
    ),
  );

  expect(response.status).toBe(403);
  expect(fetchProvider).not.toHaveBeenCalled();
  expect(setUserVerificationForOwnedVeriffSession).not.toHaveBeenCalled();
});

test("approved polling updates only the current user and exact owned session", async () => {
  requestContext = {
    user: { id: "user-1", session_id: "owned-session" },
  };

  const response = await GET(
    new Request(
      "https://dental.test/api/veriff/session-status?sessionId=owned-session",
    ),
  );

  expect(response.status).toBe(200);
  expect(setUserVerificationForOwnedVeriffSession).toHaveBeenCalledWith(
    "user-1",
    "owned-session",
  );
});
