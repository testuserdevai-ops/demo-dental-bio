import { beforeEach, expect, mock, test } from "bun:test";

let optionalHandler:
  ((request: Request, context: unknown) => Promise<Response>) | null = null;
let authHandler:
  ((request: Request, context: unknown) => Promise<Response>) | null = null;
let requestContext: unknown;
const getMaxRank = mock(async () => 4);

mock.module("@/lib/apiHandler", () => ({
  withOptionalAuth: (handler: typeof optionalHandler) => {
    optionalHandler = handler;
    return (request: Request) => handler!(request, requestContext);
  },
  withAuth: (handler: typeof authHandler) => {
    authHandler = handler;
    return (request: Request) => handler!(request, requestContext);
  },
}));
mock.module("@/lib/subscriptionCheck", () => ({
  hasActiveSubscription: () => true,
}));
mock.module("@/utils/getMaxOrder", () => ({ getMaxRank }));

const { GET, POST } = await import("./route");

const groups = [{ id: 8, name: "Featured", type: "videos", rank: 1 }];
const video = {
  id: 33,
  group_id: 8,
  title: "A complete video row",
  link: "https://example.test/video",
  rank: 1,
  enabled: true,
};

function queryResult(data: unknown) {
  let selectedColumns = "";
  const query = {
    select: mock((columns: string) => {
      selectedColumns = columns;
      return query;
    }),
    eq: mock(() => query),
    in: mock(() => query),
    order: mock(() =>
      Promise.resolve({
        data:
          selectedColumns === "group_id" && Array.isArray(data)
            ? data.map(({ group_id }) => ({ group_id }))
            : data,
        error: null,
      }),
    ),
    insert: mock(() => query),
    single: mock(() => Promise.resolve({ data, error: null })),
  };
  return query;
}

beforeEach(() => {
  getMaxRank.mockClear();
});

test("GET groups returns complete typed video rows in each datas list", async () => {
  const supabase = {
    from(table: string) {
      if (table === "groups") return queryResult(groups);
      if (table === "videos") return queryResult([video]);
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  requestContext = { supabase, user: { id: "owner", role: "user" } };
  const response = await GET(
    new Request("https://dentalbio.test/api/groups?type=videos"),
  );

  expect(await response.json()).toEqual([{ ...groups[0], datas: [video] }]);
});

test("POST groups allocates rank from the groups table", async () => {
  const supabase = {
    from(table: string) {
      if (table === "groups") return queryResult({ id: 9, rank: 5 });
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  requestContext = { supabase, user: { id: "owner", role: "user" } };
  await POST(
    new Request("https://dentalbio.test/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: "New group", type: "videos" }),
    }),
  );

  expect(getMaxRank).toHaveBeenCalledWith({
    supabase,
    table: "groups",
    field: "user_id",
    value: "owner",
  });
});
