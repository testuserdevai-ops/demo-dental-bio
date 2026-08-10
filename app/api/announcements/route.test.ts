import { beforeEach, describe, expect, mock, test } from "bun:test";

let context: unknown;
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (handler: (request: Request, value: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, context),
  withPublic:
    (handler: (request: Request, value: unknown) => Promise<Response>) =>
    (request: Request) =>
      handler(request, context),
}));

function createSupabase() {
  const single = mock(async () => ({ data: { value: "saved" }, error: null }));
  const selectAfterUpdate = mock(() => ({ single }));
  const eq = mock(() => ({ select: selectAfterUpdate }));
  const update = mock(() => ({ eq }));
  const selectAfterInsert = mock(async () => ({ data: [], error: null }));
  const insert = mock(() => ({ select: selectAfterInsert }));
  const from = mock(() => ({ insert, update }));
  return { from, insert, update };
}

const { POST, PUT } = await import("./route");

beforeEach(() => {
  context = { supabase: createSupabase(), user: { role: "admin" } };
});

function request(method: "POST" | "PUT", body: unknown) {
  return new Request("https://dental.test/api/announcements", {
    method,
    body: JSON.stringify(body),
  });
}

describe("announcement management", () => {
  test("rejects ordinary users before reading an announcement DTO", async () => {
    const supabase = createSupabase();
    context = { supabase, user: { role: "user" } };

    expect((await PUT(request("PUT", { role: "admin" }))).status).toBe(403);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test("strictly rejects malformed and extra fields before database writes", async () => {
    const supabase = createSupabase();
    context = { supabase, user: { role: "admin" } };

    for (const handler of [POST, PUT]) {
      const response = await handler(
        request(handler === POST ? "POST" : "PUT", {
          title: "Notice",
          content: "Scheduled maintenance",
          authority: "admin",
        }),
      );
      expect(response.status).toBe(400);
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test("trims and writes only controlled announcement fields", async () => {
    const supabase = createSupabase();
    context = { supabase, user: { role: "admin" } };

    const response = await PUT(
      request("PUT", {
        title: "  Notice  ",
        content: "  Scheduled maintenance  ",
      }),
    );

    expect(response.status).toBe(200);
    expect(supabase.update).toHaveBeenNthCalledWith(1, { value: "Notice" });
    expect(supabase.update).toHaveBeenNthCalledWith(2, {
      value: "Scheduled maintenance",
    });
  });
});
