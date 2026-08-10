import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request, context: unknown) =>
      handler(request, context),
}));

const { withAdminAuthorization } = await import("./http");

const request = new Request("https://dental.test/api/admin/example");
const supabase = {} as never;

function context(role: string, isBlocked = false) {
  return {
    supabase,
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      role,
      is_blocked: isBlocked,
    },
  } as never;
}

describe("admin API authorization wrapper", () => {
  it("passes only a minimal authorized actor to an allowed handler", async () => {
    const handler = mock(async (_request: Request, value: unknown) =>
      Response.json(value),
    );
    const route = withAdminAuthorization("security:read", handler as never);

    const invoke = route as unknown as (
      request: Request,
      authContext: ReturnType<typeof context>,
    ) => Promise<Response>;
    const response = await invoke(request, context("security_admin"));

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      actor: {
        id: "00000000-0000-4000-8000-000000000001",
        role: "security_admin",
      },
    });
  });

  it("returns 403 without invoking the handler for blocked or forbidden actors", async () => {
    const handler = mock(async () => Response.json({ ok: true }));
    const route = withAdminAuthorization("security:manage", handler as never);
    const invoke = route as unknown as (
      request: Request,
      authContext: ReturnType<typeof context>,
    ) => Promise<Response>;

    for (const actor of [context("security_admin"), context("admin", true)]) {
      const response = await invoke(request, actor);
      expect(response.status).toBe(403);
    }
    expect(handler).not.toHaveBeenCalled();
  });
});
