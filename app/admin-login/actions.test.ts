import { beforeEach, describe, expect, it, mock } from "bun:test";

const signInWithPassword = mock(() => Promise.resolve({ error: null }));
const getUser = mock<
  () => Promise<{ data: { user: { id: string } | null }; error: null }>
>(() => Promise.resolve({ data: { user: null }, error: null }));
const signOut = mock(() => Promise.resolve({ error: null }));
const maybeSingle = mock<
  () => Promise<{ data: { role: string } | null; error: null }>
>(() => Promise.resolve({ data: null, error: null }));
const eq = mock(() => ({ maybeSingle }));
const select = mock(() => ({ eq }));
const from = mock(() => ({ select }));
const createClient = mock(() =>
  Promise.resolve({
    auth: { signInWithPassword, getUser, signOut },
    from,
  }),
);
const redirect = mock(() => {
  throw new Error("NEXT_REDIRECT");
});

mock.module("@/app/admin-login/server-dependencies", () => ({
  createClient,
  revalidatePath: () => undefined,
  redirect,
}));

const actionModulePath = "./actions.ts?admin-login-action-test";
const { login } = await import(actionModulePath);

describe("admin login action", () => {
  beforeEach(() => {
    signInWithPassword.mockClear();
    getUser.mockClear();
    signOut.mockClear();
    maybeSingle.mockClear();
    eq.mockClear();
    select.mockClear();
    from.mockClear();
    redirect.mockClear();
    createClient.mockClear();
  });

  it("rejects malformed values with the shared validation result before authentication", async () => {
    const formData = new FormData();
    formData.set("email", "not-an-email");
    formData.set("password", "");

    expect(await login(formData)).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: {
        email: ["Enter a valid email address"],
        password: ["Password is required"],
      },
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("authorizes the authenticated immutable user id rather than submitted email", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { id: "user-immutable-id" } },
      error: null,
    });
    maybeSingle.mockResolvedValueOnce({ data: { role: "admin" }, error: null });
    const formData = new FormData();
    formData.set("email", "spoofed@example.com");
    formData.set("password", "Password!1");

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(eq).toHaveBeenCalledWith("id", "user-immutable-id");
    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(signOut).not.toHaveBeenCalled();
  });
});
