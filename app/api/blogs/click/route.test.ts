import { beforeEach, expect, mock, test } from "bun:test";

type LookupResult = { data: { id: number } | null; error: Error | null };

let lookupResult: LookupResult = { data: { id: 42 }, error: null };
const eq = mock(() => query);
const not = mock(() => query);
const maybeSingle = mock(async () => lookupResult);
const select = mock(() => query);
const rpc = mock(async () => ({ data: 1, error: null }));
const query = { eq, not, maybeSingle };
const createClient = mock(async () => ({
  from: () => ({ select }),
  rpc,
}));

mock.module("@/utils/supabase/server", () => ({ createClient }));

const { POST } = await import("./route");

function request(blogId: unknown, suffix: string) {
  return new Request("https://dental.test/api/blogs/click", {
    method: "POST",
    headers: { "x-forwarded-for": `198.51.101.${suffix}` },
    body: JSON.stringify({ blogId }),
  });
}

beforeEach(() => {
  lookupResult = { data: { id: 42 }, error: null };
  createClient.mockClear();
  select.mockClear();
  eq.mockClear();
  not.mockClear();
  maybeSingle.mockClear();
  rpc.mockClear();
  rpc.mockResolvedValue({ data: 1, error: null });
});

test("increments one enabled blog owned through an enabled public group", async () => {
  const response = await POST(request(42, "1"));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true, click_counter: 1 });
  expect(select).toHaveBeenCalledWith(
    "id, blog_groups!inner(user_id, users!inner(id))",
  );
  expect(eq).toHaveBeenCalledWith("id", 42);
  expect(eq).toHaveBeenCalledWith("enabled", true);
  expect(eq).toHaveBeenCalledWith("blog_groups.enabled", true);
  expect(not).toHaveBeenCalledWith("blog_groups.user_id", "is", null);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith("increment_click_counter", {
    table_name: "blogs",
    row_id: 42,
  });
});

test("does not increment disabled, private, or mismatched blogs", async () => {
  for (const suffix of ["2", "3", "4"]) {
    lookupResult = { data: null, error: null };
    const response = await POST(request(42, suffix));
    expect(response.status).toBe(404);
  }

  expect(rpc).not.toHaveBeenCalled();
});

test("rejects malformed IDs before querying or incrementing", async () => {
  for (const blogId of [null, 0, -1, 1.5, "42"]) {
    const response = await POST(request(blogId, `5${String(blogId).length}`));
    expect(response.status).toBe(400);
  }

  expect(createClient).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalled();
});
