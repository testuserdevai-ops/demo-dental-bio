import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";

import { setMockPathname } from "@/test/mocks/next-navigation";
import { AdminNavigation } from "./AdminNavigation";

describe("AdminNavigation", () => {
  it("shows every operations destination to full administrators", () => {
    setMockPathname("/admin/offer-codes");
    render(<AdminNavigation role="admin" />);

    for (const label of [
      "Overview",
      "Users",
      "Billing",
      "Security",
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
      screen.getAllByRole("link", {
        name: "Return to product dashboard",
      }),
    ).toHaveLength(2);
  });

  it("only exposes the permitted security destination to security admins", () => {
    setMockPathname("/admin/security");
    render(<AdminNavigation role="security_admin" />);

    expect(screen.getByRole("link", { name: "Security" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Overview" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Users" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Billing" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Offer codes" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Campaigns" })).toBeNull();
  });
});
