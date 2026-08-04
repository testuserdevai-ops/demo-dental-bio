import { describe, expect, it, mock } from "bun:test";
import { applyActionResult } from "./action-result";

describe("applyActionResult", () => {
  it("maps the first server message and focuses fields in render order", async () => {
    const clearErrors = mock(() => undefined);
    const setError = mock(() => undefined);
    const setFocus = mock(() => undefined);

    applyActionResult(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        fieldErrors: {
          password: ["Password is invalid", "Second message"],
          email: ["Email is invalid"],
        },
      },
      { clearErrors, setError, setFocus },
      ["email", "password"],
    );
    await Promise.resolve();

    expect(clearErrors).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith("password", {
      type: "server",
      message: "Password is invalid",
    });
    expect(setFocus).toHaveBeenCalledWith("email");
  });

  it("focuses the form alert when no field can receive focus", async () => {
    const focus = mock(() => undefined);
    applyActionResult(
      { ok: false, code: "AUTH_FAILED", formError: "Unable to sign in." },
      {
        clearErrors: mock(() => undefined),
        setError: mock(() => undefined),
        setFocus: mock(() => undefined),
      },
      [],
      { current: { focus } as unknown as HTMLDivElement },
    );
    await Promise.resolve();
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
