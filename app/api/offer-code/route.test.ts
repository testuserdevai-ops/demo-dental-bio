import { beforeEach, expect, mock, test } from "bun:test";

type RequestContext = {
  supabase: ReturnType<typeof createSupabase>;
  user: { role: string | null } | null;
};

let requestContext: RequestContext;
mock.module("@/lib/apiHandler", () => ({
  withAuth:
    (
      handler: (
        request: Request,
        context: Exclude<RequestContext, { user: null }>,
      ) => Promise<Response>,
    ) =>
    (request: Request) => {
      if (!requestContext.user) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
        });
      }
      return handler(
        request,
        requestContext as Exclude<RequestContext, { user: null }>,
      );
    },
}));

function createSupabase() {
  const query = {
    select: mock(async () => ({
      data: [
        { id: 1, university: "King's College London", offer_code: "KCL2026" },
      ],
      error: null,
    })),
    insert: mock(async () => ({ error: null })),
    update: mock(() => query),
    delete: mock(() => query),
    eq: mock(async () => ({ error: null })),
  };
  return { from: mock(() => query), query };
}

const { DELETE, GET, POST, PUT } = await import("./route");

beforeEach(() => {
  const supabase = createSupabase();
  requestContext = { supabase, user: { role: "admin" } };
});

test("GET does not enumerate offer codes for an anonymous caller", async () => {
  requestContext.user = null;

  const response = await GET(new Request("https://dental.test/api/offer-code"));

  expect(response.status).toBe(401);
  expect(requestContext.supabase.from).not.toHaveBeenCalled();
});

test("management endpoints reject an ordinary authenticated user", async () => {
  requestContext.user = { role: "user" };

  for (const request of [
    new Request("https://dental.test/api/offer-code"),
    new Request("https://dental.test/api/offer-code", {
      method: "POST",
      body: JSON.stringify({ university: "Leeds", offer_code: "LEEDS" }),
    }),
    new Request("https://dental.test/api/offer-code", {
      method: "PUT",
      body: JSON.stringify({
        id: 1,
        value: { university: "Leeds", offer_code: "LEEDS" },
      }),
    }),
    new Request("https://dental.test/api/offer-code", {
      method: "DELETE",
      body: JSON.stringify({ id: 1 }),
    }),
  ]) {
    const handler =
      request.method === "POST"
        ? POST
        : request.method === "PUT"
          ? PUT
          : request.method === "DELETE"
            ? DELETE
            : GET;
    expect((await handler(request)).status).toBe(403);
  }
  expect(requestContext.supabase.from).not.toHaveBeenCalled();
});

test("admin management uses strict validated DTOs and preserves response shapes", async () => {
  const getResponse = await GET(
    new Request("https://dental.test/api/offer-code"),
  );
  expect(getResponse.status).toBe(200);
  expect(await getResponse.json()).toEqual([
    { id: 1, university: "King's College London", offer_code: "KCL2026" },
  ]);

  const postResponse = await POST(
    new Request("https://dental.test/api/offer-code", {
      method: "POST",
      body: JSON.stringify({
        university: "  Leeds ",
        offer_code: " LEEDS ",
        ignored: true,
      }),
    }),
  );
  expect(postResponse.status).toBe(400);
  expect(requestContext.supabase.query.insert).not.toHaveBeenCalled();

  const putResponse = await PUT(
    new Request("https://dental.test/api/offer-code", {
      method: "PUT",
      body: JSON.stringify({
        id: 1,
        value: { university: "Leeds", offer_code: "LEEDS", ignored: true },
      }),
    }),
  );
  expect(putResponse.status).toBe(400);
  expect(requestContext.supabase.query.update).not.toHaveBeenCalled();

  const deleteResponse = await DELETE(
    new Request("https://dental.test/api/offer-code", {
      method: "DELETE",
      body: JSON.stringify({ id: 1, ignored: true }),
    }),
  );
  expect(deleteResponse.status).toBe(400);
  expect(requestContext.supabase.query.delete).not.toHaveBeenCalled();
});

test("admin create, update, and delete pass only validated values to Supabase", async () => {
  await POST(
    new Request("https://dental.test/api/offer-code", {
      method: "POST",
      body: JSON.stringify({ university: "  Leeds ", offer_code: " LEEDS " }),
    }),
  );
  expect(requestContext.supabase.query.insert).toHaveBeenCalledWith({
    university: "Leeds",
    offer_code: "LEEDS",
  });

  await PUT(
    new Request("https://dental.test/api/offer-code", {
      method: "PUT",
      body: JSON.stringify({
        id: 1,
        value: { university: "Leeds", offer_code: "LEEDS" },
      }),
    }),
  );
  expect(requestContext.supabase.query.update).toHaveBeenCalledWith({
    university: "Leeds",
    offer_code: "LEEDS",
  });

  await DELETE(
    new Request("https://dental.test/api/offer-code", {
      method: "DELETE",
      body: JSON.stringify({ id: 1 }),
    }),
  );
  expect(requestContext.supabase.query.eq).toHaveBeenCalledWith("id", 1);
});
