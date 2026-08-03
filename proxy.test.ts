import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest, NextResponse } from "next/server";
import { handleProxy } from "./proxy";

const updateSession = mock(
  async (_request: NextRequest): Promise<NextResponse> => NextResponse.next(),
);
const lookupUsernameByDomain = mock(
  async (_host: string): Promise<string | null> => null,
);

const proxy = (proxyRequest: NextRequest) =>
  handleProxy(proxyRequest, { updateSession, lookupUsernameByDomain });

function request(pathname: string, headers: HeadersInit): NextRequest {
  const requestHeaders = new Headers(headers);
  const host = requestHeaders.get("host") ?? "proxy.test";
  const proxyRequest = new NextRequest(`https://${host}${pathname}`, {
    headers: requestHeaders,
  });
  const headersWithHost = new Headers(requestHeaders);
  headersWithHost.set("host", host);

  Object.defineProperty(proxyRequest, "headers", {
    value: headersWithHost,
  });

  return proxyRequest;
}

function rewriteUrl(response: NextResponse): URL {
  const rewrite = response.headers.get("x-middleware-rewrite");
  if (!rewrite) throw new Error("Expected a rewrite response");
  return new URL(rewrite);
}

beforeEach(() => {
  updateSession.mockReset();
  updateSession.mockImplementation(
    async (_request: NextRequest): Promise<NextResponse> => NextResponse.next(),
  );
  lookupUsernameByDomain.mockReset();
  lookupUsernameByDomain.mockResolvedValue(null);
});

describe("proxy", () => {
  it("delegates platform hosts to session handling and supplies the host fallback", async () => {
    const response = await proxy(request("/dashboard", { host: "dental.bio" }));

    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(lookupUsernameByDomain).not.toHaveBeenCalled();
    expect(response.headers.get("x-forwarded-host")).toBe("dental.bio");
  });

  it("uses an existing forwarded host without replacing it", async () => {
    const proxyRequest = request("/", {
      host: "custom.example",
      "x-forwarded-host": "coach.bio",
    });

    const response = await proxy(proxyRequest);

    expect(updateSession).toHaveBeenCalledWith(proxyRequest);
    expect(lookupUsernameByDomain).not.toHaveBeenCalled();
    expect(response.headers.get("x-forwarded-host")).toBeNull();
  });

  it("rewrites a known custom domain root while preserving the query string", async () => {
    lookupUsernameByDomain.mockResolvedValue("alice");

    const response = await proxy(
      request("/?ref=campaign", { host: "profile.example" }),
    );

    const url = rewriteUrl(response);
    expect(lookupUsernameByDomain).toHaveBeenCalledWith("profile.example");
    expect(updateSession).not.toHaveBeenCalled();
    expect(url.pathname).toBe("/alice");
    expect(url.search).toBe("?ref=campaign");
  });

  it("rewrites a known custom-domain nested path while preserving the query string", async () => {
    lookupUsernameByDomain.mockResolvedValue("alice");

    const response = await proxy(
      request("/blog/post?preview=1", { host: "profile.example" }),
    );

    const url = rewriteUrl(response);
    expect(updateSession).not.toHaveBeenCalled();
    expect(url.pathname).toBe("/alice/blog/post");
    expect(url.search).toBe("?preview=1");
  });

  it("falls through to session handling when a custom domain is unknown", async () => {
    const response = await proxy(request("/", { host: "unknown.example" }));

    expect(lookupUsernameByDomain).toHaveBeenCalledWith("unknown.example");
    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(response.headers.get("x-forwarded-host")).toBe("unknown.example");
  });

  it.each(["/api/health", "/_next/data/build-id", "/monitoring"])(
    "bypasses domain lookup for custom-domain infrastructure path %s",
    async (pathname) => {
      await proxy(request(pathname, { host: "profile.example" }));

      expect(lookupUsernameByDomain).not.toHaveBeenCalled();
      expect(updateSession).toHaveBeenCalledTimes(1);
    },
  );
});
