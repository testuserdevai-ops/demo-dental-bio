// @ts-nocheck -- Bun provides test globals at runtime.
import { afterEach, describe, expect, it, mock, setSystemTime } from "bun:test";
import {
  act,
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
const originalSetInterval = window.setInterval;

afterEach(() => {
  cleanup();
  setSystemTime();
  localStorage.clear();
  window.setInterval = originalSetInterval;
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

  it("locks immediately on the third failure with a visible countdown", async () => {
    setSystemTime(new Date("2026-08-03T20:00:00.000Z"));
    render(<LoginPage />);
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    fireEvent.change(email, { target: { value: "owner@example.com" } });
    fireEvent.change(password, { target: { value: "Password!1" } });

    for (let attempt = 1; attempt <= 3; attempt++) {
      fireEvent.click(screen.getByRole("button", { name: "Log In" }));
      await waitFor(() => expect(login).toHaveBeenCalledTimes(attempt));
      if (attempt < 3) {
        await waitFor(() =>
          expect(screen.getByRole("button", { name: "Log In" }).disabled).toBe(
            false,
          ),
        );
      }
    }

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Please wait before trying again");
    expect(alert.textContent).toContain(
      "Too many unsuccessful attempts. Try again in 60 seconds.",
    );
    expect(
      screen.getByRole("button", { name: "Try again in 60 seconds" }).disabled,
    ).toBe(true);
    expect(email.value).toBe("owner@example.com");
    expect(password.value).toBe("Password!1");
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });

  it("restores, ticks, and expires a persisted lockout without stealing focus or clearing fields", async () => {
    const lockoutStartedAt = new Date("2026-08-03T20:00:00.000Z");
    setSystemTime(lockoutStartedAt);
    localStorage.setItem("loginAttempts", "3");
    localStorage.setItem(
      "lockoutEndTime",
      String(lockoutStartedAt.getTime() + 60_000),
    );
    let intervalCallback: (() => void) | undefined;
    window.setInterval = ((callback: TimerHandler, delay?: number) => {
      if (delay === 1_000) {
        intervalCallback = callback as () => void;
        return 1;
      }
      return originalSetInterval(callback, delay);
    }) as typeof window.setInterval;

    render(<LoginPage />);

    const restoredAlert = await screen.findByRole("alert");
    expect(restoredAlert.textContent).toContain("Try again in 60 seconds");
    await waitFor(() => expect(document.activeElement).toBe(restoredAlert));
    expect(intervalCallback).toBeDefined();

    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    fireEvent.change(email, { target: { value: "owner@example.com" } });
    fireEvent.change(password, { target: { value: "Password!1" } });
    email.focus();

    setSystemTime(new Date(lockoutStartedAt.getTime() + 1_000));
    act(() => intervalCallback?.());
    expect(
      screen.getByRole("button", { name: "Try again in 59 seconds" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(email);
    expect(
      screen
        .getByText(/Too many unsuccessful attempts/)
        .getAttribute("aria-live"),
    ).toBe("off");

    setSystemTime(new Date(lockoutStartedAt.getTime() + 60_000));
    act(() => intervalCallback?.());
    expect(screen.getByRole("button", { name: "Log In" }).disabled).toBe(false);
    expect(localStorage.getItem("loginAttempts")).toBeNull();
    expect(localStorage.getItem("lockoutEndTime")).toBeNull();
    expect(email.value).toBe("owner@example.com");
    expect(password.value).toBe("Password!1");
  });
});
