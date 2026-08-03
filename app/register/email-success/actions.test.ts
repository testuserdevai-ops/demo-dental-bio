import { beforeEach, describe, expect, it, mock } from "bun:test";

const signInWithPassword = mock(() => Promise.resolve({ error: null }));
const createClient = mock(() =>
  Promise.resolve({ auth: { signInWithPassword } }),
);

mock.module("@/app/register/email-success/server-dependencies", () => ({
  createClient,
  redirect: () => undefined,
}));

const actionModulePath = "./actions.ts?email-success-action-test";
const { login } = await import(actionModulePath);

describe("email-success login action", () => {
  beforeEach(() => {
    signInWithPassword.mockClear();
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
});
