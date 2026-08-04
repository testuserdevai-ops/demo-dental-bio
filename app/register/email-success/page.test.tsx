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

mock.module("@/app/register/email-success/actions", () => ({ login }));
mock.module("@/utils/hooks/useDomainConfig", () => ({
  useDomainConfig: () => ({ logoPath: logoFixture, brandName: "DentalBio" }),
}));

const { default: EmailSuccessPage } = await import("./page");

afterEach(() => {
  cleanup();
  login.mockClear();
});

describe("post-verification login form", () => {
  it("uses accessible credentials and maps authentication failures to its alert", async () => {
    render(<EmailSuccessPage />);
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    expect(email.getAttribute("autocomplete")).toBe("username");
    expect(password.getAttribute("autocomplete")).toBe("current-password");
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
