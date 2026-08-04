import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const sendReferralInvite = mock(async () => ({
  ok: false as const,
  code: "INVITE_FAILED",
  formError: "The invitation could not be sent. Try again.",
}));
mock.module("../_lib/actions", () => ({ sendReferralInvite }));
mock.module("sonner", () => ({ toast: { success: mock() } }));

const { InviteEmailForm } = await import("./InviteEmailForm");

describe("InviteEmailForm", () => {
  it("validates locally and preserves the email after provider failure", async () => {
    render(<InviteEmailForm />);
    fireEvent.click(screen.getByRole("button", { name: "Send referral link" }));
    await waitFor(() =>
      expect(screen.getByText("Enter a valid email address")).toBeTruthy(),
    );
    const input = screen.getByLabelText("Email");
    fireEvent.change(input, { target: { value: "friend@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send referral link" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect((input as HTMLInputElement).value).toBe("friend@example.com");
    expect(sendReferralInvite).toHaveBeenCalledWith(undefined, {
      email: "friend@example.com",
    });
  });
});
