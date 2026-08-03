// @ts-nocheck -- Bun provides test globals at runtime.
import React from "react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const login = mock(() =>
  Promise.resolve({
    ok: false,
    code: "ADMIN_ACCESS_DENIED",
    formError: "Unable to sign in to this account.",
  }),
);

mock.module("@/app/admin-login/actions", () => ({ login }));
mock.module("next/font/google", () => ({ Manrope: () => ({ className: "" }) }));
mock.module("@/app/components/Image/SafeImage", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} />
  ),
}));
mock.module("@/utils/hooks/useDomainConfig", () => ({
  useDomainConfig: () => ({ logoPath: "/logo.svg", brandName: "DentalBio" }),
}));

const { default: AdminLoginPage } = await import("./page");

afterEach(() => {
  cleanup();
  login.mockClear();
});

describe("admin login form", () => {
  it("uses accessible credential fields and keeps values after denial", async () => {
    render(<AdminLoginPage />);
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    expect(email.getAttribute("autocomplete")).toBe("username");
    expect(password.getAttribute("autocomplete")).toBe("current-password");
    fireEvent.change(email, { target: { value: "admin@example.com" } });
    fireEvent.change(password, { target: { value: "Password!1" } });
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Unable to sign in");
    expect(email.value).toBe("admin@example.com");
    expect(password.value).toBe("Password!1");
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });
});
