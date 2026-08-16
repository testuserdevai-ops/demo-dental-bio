import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  navigationSpies,
  resetNavigationMocks,
  setMockPathname,
} from "@/test/mocks/next-navigation";

const signOut = mock<() => Promise<{ error: Error | null }>>();

mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { signOut } }),
}));

const { AdminNavigation } = await import("./AdminNavigation");

beforeEach(() => {
  signOut.mockReset();
  resetNavigationMocks();
});

describe("AdminNavigation", () => {
  it("shows every operations destination to full administrators", () => {
    setMockPathname("/admin/offer-codes");
    render(<AdminNavigation role="admin" />);

    for (const label of [
      "Overview",
      "Users",
      "Billing",
      "Security",
      "Reports",
      "Offer codes",
      "Campaigns",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeTruthy();
    }
    expect(
      screen
        .getByRole("link", { name: "Offer codes" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("button", {
        name: "Sign out and leave admin console",
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Switch to User dashboard" })
        .getAttribute("href"),
    ).toBe("/dashboard");
  });

  it("only exposes the permitted trust and security destinations to security admins", () => {
    setMockPathname("/admin/security");
    render(<AdminNavigation role="security_admin" />);

    expect(screen.getByRole("link", { name: "Security" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Reports" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Overview" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Users" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Billing" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Offer codes" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Campaigns" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Switch to User dashboard" }),
    ).toBeNull();
  });

  it("signs out before leaving the protected admin shell", async () => {
    signOut.mockResolvedValue({ error: null });
    render(<AdminNavigation role="admin" />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Sign out and leave admin console",
      }),
    );

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(navigationSpies.replace).toHaveBeenCalledWith("/");
    expect(navigationSpies.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the administrator in place and reports a sign-out failure", async () => {
    signOut.mockResolvedValue({ error: new Error("Sign-out failed") });
    render(<AdminNavigation role="admin" />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Sign out and leave admin console",
      }),
    );

    expect(
      (
        await screen.findByText(
          "Unable to exit the admin console. Please try again.",
        )
      ).getAttribute("role"),
    ).toBe("alert");
    expect(navigationSpies.replace).not.toHaveBeenCalled();
    expect(navigationSpies.refresh).not.toHaveBeenCalled();
  });
});
