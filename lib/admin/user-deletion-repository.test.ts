import { beforeEach, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
const deleteUser = mock(async (): Promise<{ error: Error | null }> => ({
  error: null,
}));
mock.module("@/lib/supabase/admin", () => ({
  supabaseAdmin: { auth: { admin: { deleteUser } } },
}));

const { deleteAuthUserForAdmin } = await import("./user-deletion-repository");

beforeEach(() => {
  deleteUser.mockReset();
  deleteUser.mockResolvedValue({ error: null });
});

test("admin user deletion repository deletes only the exact auth user", async () => {
  await deleteAuthUserForAdmin("00000000-0000-4000-8000-000000000002");
  expect(deleteUser).toHaveBeenCalledWith(
    "00000000-0000-4000-8000-000000000002",
  );
});

test("admin user deletion repository propagates a bounded failure", async () => {
  deleteUser.mockResolvedValueOnce({ error: new Error("provider detail") });
  expect(
    deleteAuthUserForAdmin("00000000-0000-4000-8000-000000000002"),
  ).rejects.toThrow("Auth user deletion failed");
});
