// @ts-nocheck -- Bun provides test globals at runtime.
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
    code: "AUTH_FAILED",
    formError: "Unable to sign in with those credentials.",
  }),
);
const logoFixture =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='25'/%3E";

mock.module("@/app/login/actions", () => ({ login }));
mock.module("next/font/google", () => ({ Manrope: () => ({ className: "" }) }));
mock.module("@/utils/hooks/useDomainConfig", () => ({
  useDomainConfig: () => ({ logoPath: logoFixture, brandName: "DentalBio" }),
}));
mock.module("@/utils/hooks/useDeviceFingerprint", () => ({
  useDeviceFingerprint: () => "fingerprint-1",
}));

const { default: LoginPage } = await import("./page");

afterEach(() => {
  cleanup();
  login.mockClear();
});

describe("login form", () => {
  it("labels password-manager fields and focuses the first client validation error", async () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("Email").getAttribute("autocomplete")).toBe(
      "username",
    );
    expect(screen.getByLabelText("Password").getAttribute("autocomplete")).toBe(
      "current-password",
    );
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    await waitFor(() =>
      expect(screen.getByText("Email is required")).toBeTruthy(),
    );
    expect(document.activeElement).toBe(screen.getByLabelText("Email"));
    expect(login).not.toHaveBeenCalled();
  });

  it("preserves values and focuses the form alert after an authentication failure", async () => {
    render(<LoginPage />);
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    fireEvent.change(email, { target: { value: "owner@example.com" } });
    fireEvent.change(password, { target: { value: "Password!1" } });
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Unable to sign in");
    expect(email.value).toBe("owner@example.com");
    expect(password.value).toBe("Password!1");
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });
});
