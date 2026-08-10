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
const getUserBlockedStatusById = mock(async () => false as boolean | null);
const storeDeviceFingerprint = mock(async () => undefined);
const storeUserIp = mock(async () => undefined);
const logSecurityEvent = mock(() => undefined);
const createClient = mock(() =>
  Promise.resolve({ auth: { signInWithPassword, getUser, signOut } }),
);

mock.module("@/app/login/server-dependencies", () => ({
  createClient,
  headers: () => new Headers(),
  getUserBlockedStatusById,
  isBlockedFingerprint: () => Promise.resolve(false),
  storeDeviceFingerprint,
  isBlockedIp: () => Promise.resolve(false),
  storeUserIp,
  logSecurityEvent,
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
    getUserBlockedStatusById.mockReset();
    getUserBlockedStatusById.mockResolvedValue(false);
    storeDeviceFingerprint.mockClear();
    storeUserIp.mockClear();
    logSecurityEvent.mockClear();
    revalidatePath.mockClear();
    redirect.mockClear();
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
    expect(getUserBlockedStatusById).not.toHaveBeenCalled();
  });

  it("looks up blocked status and stores security signals by the verified immutable user ID", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { id: "verified-user-id" } },
      error: null,
    });
    const formData = new FormData();
    formData.set("email", "owner@example.com");
    formData.set("password", "Password!1");
    formData.set("deviceFingerprint", "fingerprint-1");

    expect(await login(formData)).toBeUndefined();
    expect(getUserBlockedStatusById).toHaveBeenCalledWith("verified-user-id");
    expect(storeDeviceFingerprint).toHaveBeenCalledWith(
      "verified-user-id",
      "fingerprint-1",
    );
    expect(storeUserIp).toHaveBeenCalledWith("verified-user-id", null);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("fails closed without leaking authority-read failures", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { id: "verified-user-id" } },
      error: null,
    });
    getUserBlockedStatusById.mockRejectedValueOnce(
      new Error("Account authority read failed"),
    );
    const formData = new FormData();
    formData.set("email", "owner@example.com");
    formData.set("password", "Password!1");

    expect(await login(formData)).toEqual({
      ok: false,
      code: "AUTH_FAILED",
      formError: "Unable to sign in with those credentials.",
    });
    expect(getUserBlockedStatusById).toHaveBeenCalledWith("verified-user-id");
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(storeDeviceFingerprint).not.toHaveBeenCalled();
    expect(storeUserIp).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("signs out a blocked verified user with the same generic response", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { id: "blocked-user-id" } },
      error: null,
    });
    getUserBlockedStatusById.mockResolvedValueOnce(true);
    const formData = new FormData();
    formData.set("email", "owner@example.com");
    formData.set("password", "Password!1");

    expect(await login(formData)).toEqual({
      ok: false,
      code: "AUTH_FAILED",
      formError: "Unable to sign in with those credentials.",
    });
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "blocked_user",
        details: { blocked_user_id: "blocked-user-id" },
      }),
    );
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(storeDeviceFingerprint).not.toHaveBeenCalled();
  });
});
