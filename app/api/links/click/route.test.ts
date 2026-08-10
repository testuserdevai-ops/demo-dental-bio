import { beforeEach, expect, mock, test } from "bun:test";

type LookupResult = { data: { link_id: string } | null; error: Error | null };

let lookupResult: LookupResult = {
  data: { link_id: "11111111-1111-4111-8111-111111111111" },
  error: null,
};
const eq = mock(() => query);
const maybeSingle = mock(async () => lookupResult);
const select = mock(() => query);
const rpc = mock(async () => ({ data: 1, error: null }));
const query = { eq, maybeSingle };
const createClient = mock(async () => ({
  from: () => ({ select }),
  rpc,
}));

mock.module("@/utils/supabase/server", () => ({ createClient }));

const { POST } = await import("./route");

function request(linkId: unknown, suffix: string) {
  return new Request("https://dental.test/api/links/click", {
    method: "POST",
    headers: { "x-forwarded-for": `198.51.100.${suffix}` },
    body: JSON.stringify({ linkId }),
  });
}

beforeEach(() => {
  lookupResult = {
    data: { link_id: "11111111-1111-4111-8111-111111111111" },
    error: null,
  };
  createClient.mockClear();
  select.mockClear();
  eq.mockClear();
  maybeSingle.mockClear();
  rpc.mockClear();
  rpc.mockResolvedValue({ data: 1, error: null });
});

test("increments one active link owned through a public profile", async () => {
  const linkId = "11111111-1111-4111-8111-111111111111";
  const response = await POST(request(linkId, "1"));

  expect(response.status).toBe(200);
  expect(select).toHaveBeenCalledWith(
    "link_id, dentistry_links!inner(link_groups!inner(dentistries!inner(user_id, users!inner(id))))",
  );
  expect(eq).toHaveBeenCalledWith("link_id", linkId);
  expect(eq).toHaveBeenCalledWith("is_active", true);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith("increment_click_counter", {
    table_name: "links",
    row_id: linkId,
  });
});

test("does not increment disabled, orphaned, or mismatched links", async () => {
  const linkId = "11111111-1111-4111-8111-111111111111";

  for (const suffix of ["2", "3", "4"]) {
    lookupResult = { data: null, error: null };
    const response = await POST(request(linkId, suffix));
    expect(response.status).toBe(404);
  }

  expect(rpc).not.toHaveBeenCalled();
});

test("rejects malformed IDs before querying or incrementing", async () => {
  for (const linkId of [null, "", "not-a-uuid", 42]) {
    const response = await POST(request(linkId, `5${String(linkId).length}`));
    expect(response.status).toBe(400);
  }

  expect(createClient).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalled();
});
