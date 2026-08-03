import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { CookieOptions } from "@supabase/ssr";
import { NextRequest } from "next/server";

type RefreshedCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

type ServerClientOptions = {
  cookies: {
    setAll: (
      cookies: RefreshedCookie[],
      headers: Record<string, string>,
    ) => void;
  };
};

let currentUser: { id: string } | null = null;
let currentRole: "admin" | "user" | null = null;
let refreshCookies: RefreshedCookie[] = [];
let refreshHeaders: Record<string, string> = {};

const createServerClient = mock(
  (_: string, __: string, options: ServerClientOptions) => ({
    auth: {
      getUser: async () => {
        if (refreshCookies.length || Object.keys(refreshHeaders).length) {
          options.cookies.setAll(refreshCookies, refreshHeaders);
        }
        return { data: { user: currentUser } };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: currentRole ? { role: currentRole } : null,
          }),
        }),
      }),
    }),
  }),
);

mock.module("@supabase/ssr", () => ({ createServerClient }));

const { updateSession } = await import("./middleware");

function request(pathname: string) {
  return new NextRequest(`https://dentalbio.test${pathname}`);
}

beforeEach(() => {
  currentUser = null;
  currentRole = null;
  refreshCookies = [];
  refreshHeaders = {};
  createServerClient.mockClear();
});

describe("updateSession", () => {
  it("redirects anonymous dashboard requests to login", async () => {
    const response = await updateSession(request("/dashboard/treatments"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://dentalbio.test/login",
    );
  });

  it("redirects anonymous admin requests to login", async () => {
    const response = await updateSession(request("/admin/security"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://dentalbio.test/login",
    );
  });

  it("redirects authenticated non-admin users away from admin", async () => {
    currentUser = { id: "user-1" };
    currentRole = "user";

    const response = await updateSession(request("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://dentalbio.test/dashboard",
    );
  });

  it("allows authenticated admins through", async () => {
    currentUser = { id: "admin-1" };
    currentRole = "admin";

    const response = await updateSession(request("/admin"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows normal public routes through without an authenticated user", async () => {
    const response = await updateSession(request("/pricing"));

    expect(response.status).toBe(200);
    expect(createServerClient).toHaveBeenCalledTimes(1);
  });

  it("copies refreshed cookies and response cache headers", async () => {
    refreshCookies = [
      { name: "sb-refresh", value: "rotated", options: { path: "/" } },
    ];
    refreshHeaders = {
      "Cache-Control": "private, no-store",
      Expires: "0",
      Pragma: "no-cache",
    };

    const response = await updateSession(request("/"));

    expect(response.cookies.get("sb-refresh")?.value).toBe("rotated");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("preserves refreshed session data when a guard redirects", async () => {
    refreshCookies = [
      { name: "sb-refresh", value: "rotated", options: { path: "/" } },
    ];
    refreshHeaders = {
      "Cache-Control": "private, no-store",
      Expires: "0",
      Pragma: "no-cache",
    };

    const response = await updateSession(request("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://dentalbio.test/login",
    );
    expect(response.cookies.get("sb-refresh")?.value).toBe("rotated");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});
