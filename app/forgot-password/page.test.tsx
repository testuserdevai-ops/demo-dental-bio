import React from "react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const requestPasswordReset = mock(async () => ({
  ok: false as const,
  code: "VALIDATION_ERROR",
  fieldErrors: { email: ["Enter a valid email address"] },
}));

mock.module("server-only", () => ({}));
mock.module("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("email=owner%40example.com"),
  useRouter: () => ({ push: mock() }),
}));
mock.module("sonner", () => ({ toast: { success: mock(), error: mock() } }));

const { default: ForgotPasswordPage } = await import("./page");

afterEach(() => {
  cleanup();
  requestPasswordReset.mockClear();
});

describe("ForgotPasswordPage", () => {
  it("prefills but does not authorize a query email, and maps a server field error without clearing it", async () => {
    render(
      <ForgotPasswordPage
        actions={{
          requestPasswordReset,
          updateRecoveryPassword: mock(),
          verifyRecoveryOtp: mock(),
        }}
      />,
    );
    const email = screen.getByRole("textbox", { name: "Email address" });

    expect((email as HTMLInputElement).value).toBe("owner@example.com");
    expect(email.hasAttribute("readonly")).toBe(false);
    fireEvent.submit(email.closest("form")!);

    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith({
        email: "owner@example.com",
      }),
    );
    expect((email as HTMLInputElement).value).toBe("owner@example.com");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toContain(
      "Enter a valid email address",
    );
  });

  it("resends a code for the server-validated recovery email", async () => {
    const successfulRequest = mock(async () => ({
      ok: true as const,
      data: undefined,
    }));
    render(
      <ForgotPasswordPage
        actions={{
          requestPasswordReset: successfulRequest,
          updateRecoveryPassword: mock(),
          verifyRecoveryOtp: mock(),
        }}
      />,
    );

    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    const resend = await screen.findByRole("button", {
      name: "Resend recovery code",
    });
    fireEvent.click(resend);

    await waitFor(() => expect(successfulRequest).toHaveBeenCalledTimes(2));
    expect(successfulRequest).toHaveBeenLastCalledWith({
      email: "owner@example.com",
    });
  });
});
