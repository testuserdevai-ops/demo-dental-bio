import { beforeEach, describe, expect, it, mock } from "bun:test";

const signInWithPassword = mock(() => Promise.resolve({ error: null }));
const getUser = mock<
  () => Promise<{
    data: { user: { id: string } | null };
    error: { message: string } | null;
  }>
>(() => Promise.resolve({ data: { user: null }, error: null }));
const signOut = mock(() => Promise.resolve({ error: null }));
const revalidatePath = mock(() => undefined);
const redirect = mock(() => undefined);
const createClient = mock(() =>
  Promise.resolve({ auth: { signInWithPassword, getUser, signOut } }),
);

mock.module("@/app/login/server-dependencies", () => ({
  createClient,
  headers: () => new Headers(),
  supabaseAdmin: {},
  isBlockedFingerprint: () => Promise.resolve(false),
  storeDeviceFingerprint: () => Promise.resolve(),
  isBlockedIp: () => Promise.resolve(false),
  storeUserIp: () => Promise.resolve(),
  logSecurityEvent: () => undefined,
  revalidatePath,
  redirect,
}));

const actionModulePath = "./actions.ts?login-action-test";
const { login } = await import(actionModulePath);

describe("login action", () => {
  beforeEach(() => {
    signInWithPassword.mockClear();
    getUser.mockClear();
    signOut.mockClear();
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

  it("fails closed when authentication does not establish a verified user", async () => {
    const formData = new FormData();
    formData.set("email", "owner@example.com");
    formData.set("password", "Password!1");

    expect(await login(formData)).toEqual({
      ok: false,
      code: "AUTH_FAILED",
      formError: "Unable to sign in with those credentials.",
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
