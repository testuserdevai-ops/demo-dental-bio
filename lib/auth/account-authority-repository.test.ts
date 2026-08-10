import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const maybeSingle = mock(
  async (): Promise<{
    data: { is_blocked: boolean } | null;
    error: Error | null;
  }> => ({ data: { is_blocked: false }, error: null }),
);
const eq = mock(() => ({ maybeSingle }));
const select = mock(() => ({ eq }));
const from = mock(() => ({ select }));
const deleteUser = mock(async (): Promise<{ error: Error | null }> => ({
  error: null,
}));

mock.module("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from,
    auth: { admin: { deleteUser } },
  },
}));

const { deleteAuthUserById, getUserBlockedStatusById } =
  await import("./account-authority-repository");

const USER_ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  from.mockClear();
  select.mockClear();
  eq.mockClear();
  maybeSingle.mockReset();
  maybeSingle.mockResolvedValue({
    data: { is_blocked: false },
    error: null,
  });
  deleteUser.mockReset();
  deleteUser.mockResolvedValue({ error: null });
});

describe("account authority repository", () => {
  test("reads only blocked status for the exact immutable user ID", async () => {
    expect(await getUserBlockedStatusById(USER_ID)).toBe(false);

    expect(from).toHaveBeenCalledWith("users");
    expect(select).toHaveBeenCalledWith("is_blocked");
    expect(eq).toHaveBeenCalledWith("id", USER_ID);
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  test("returns null when the exact user row does not exist", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    expect(await getUserBlockedStatusById(USER_ID)).toBeNull();
  });

  test("propagates a bounded authority-read failure", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error("provider detail"),
    });

    expect(getUserBlockedStatusById(USER_ID)).rejects.toThrow(
      "Account authority read failed",
    );
  });

  test("deletes only the exact auth user ID", async () => {
    await deleteAuthUserById(USER_ID);

    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  test("propagates a bounded auth deletion failure", async () => {
    deleteUser.mockResolvedValueOnce({ error: new Error("provider detail") });

    expect(deleteAuthUserById(USER_ID)).rejects.toThrow(
      "Auth user deletion failed",
    );
  });
});
