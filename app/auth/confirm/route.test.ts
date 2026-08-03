import { afterEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

const exchangeCodeForSession = mock(async (_code: string) => ({
  data: { session: null, user: null },
  error: null,
}));

const mockCreateClient = mock(async () => ({
  auth: { exchangeCodeForSession },
}));

// The route imports its server client at module evaluation time, so this scoped
// test module must register its replacement before dynamically importing GET.
mock.module("@/app/auth/confirm/server-dependencies", () => ({
  createClient: mockCreateClient,
}));

const { GET } = await import("./route");

afterEach(() => {
  mockCreateClient.mockClear();
  exchangeCodeForSession.mockClear();
});

describe("GET /auth/confirm", () => {
  it("exchanges a supplied code once and redirects to the safe default", async () => {
    const response = await GET(
      new NextRequest("https://dentalbio.test/auth/confirm?code=auth-code"),
    );

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("auth-code");
    expect(response.headers.get("location")).toBe(
      "https://dentalbio.test/dashboard",
    );
  });

  it("does not create a client without a code and still redirects to the default", async () => {
    const response = await GET(
      new NextRequest("https://dentalbio.test/auth/confirm"),
    );

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://dentalbio.test/dashboard",
    );
  });

  it("uses an in-app next path while preserving the request origin", async () => {
    const response = await GET(
      new NextRequest(
        "https://preview.dentalbio.test/auth/confirm?code=auth-code&next=%2Fdashboard%2Fsettings%3Ftab%3Dprofile",
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("auth-code");
    expect(response.headers.get("location")).toBe(
      "https://preview.dentalbio.test/dashboard/settings?tab=profile",
    );
  });

  it("rejects hostile next values and keeps the callback on the safe default", async () => {
    for (const next of [
      "https://evil.example",
      "//evil.example/path",
      "dashboard",
      "/%2f%2fevil.example",
    ]) {
      const response = await GET(
        new NextRequest(
          `https://dentalbio.test/auth/confirm?next=${encodeURIComponent(next)}`,
        ),
      );

      expect(response.headers.get("location")).toBe(
        "https://dentalbio.test/dashboard",
      );
    }
  });
});
