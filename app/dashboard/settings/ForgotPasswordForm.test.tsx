import React from "react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { resetNavigationMocks } from "@/test/mocks/next-navigation";

const requestPasswordReset = mock(async () => ({
  ok: true as const,
  data: undefined,
}));

mock.module("server-only", () => ({}));
mock.module("sonner", () => ({ toast: { success: mock() } }));
const { default: ForgotPasswordForm } = await import("./ForgotPasswordForm");

afterEach(() => {
  cleanup();
  resetNavigationMocks();
  requestPasswordReset.mockClear();
});

describe("dashboard password recovery", () => {
  it("uses the server action with the authorized email instead of client Supabase", async () => {
    render(
      <ForgotPasswordForm
        defaultEmail="owner@example.com"
        requestReset={requestPasswordReset}
      />,
    );

    expect(
      (
        screen.getByRole("textbox", {
          name: "Email address",
        }) as HTMLInputElement
      ).value,
    ).toBe("owner@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send recovery code" }));

    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith({
        email: "owner@example.com",
      }),
    );
  });
});
