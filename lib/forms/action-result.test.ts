import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { actionError, zodActionError } from "./action-result";

describe("ActionResult helpers", () => {
  it("preserves every Zod message under its field path", () => {
    const result = zodActionError(
      z
        .object({ email: z.string().email(), password: z.string().min(8) })
        .safeParse({ email: "bad", password: "short" }).error!,
    );

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: {
        email: ["Invalid email address"],
        password: ["Too small: expected string to have >=8 characters"],
      },
    });
  });

  it("creates a stable form-level failure", () => {
    expect(actionError("AUTH_FAILED", "Unable to sign in.")).toEqual({
      ok: false,
      code: "AUTH_FAILED",
      formError: "Unable to sign in.",
    });
  });
});
