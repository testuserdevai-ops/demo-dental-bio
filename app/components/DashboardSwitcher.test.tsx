import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { DashboardSwitcher } from "./DashboardSwitcher";

afterEach(cleanup);

describe("DashboardSwitcher", () => {
  it("renders a native admin-dashboard link for authorized administrators", () => {
    render(<DashboardSwitcher canSwitch destination="admin" />);

    const link = screen.getByRole("link", {
      name: "Switch to Admin dashboard",
    });
    expect(link.getAttribute("href")).toBe("/admin");
    expect(link.getAttribute("data-analytics-exclusion")).toBe(
      "authenticated-dashboard-navigation",
    );
  });

  it("renders a native user-dashboard link for authorized administrators", () => {
    render(<DashboardSwitcher canSwitch destination="user" />);

    expect(
      screen
        .getByRole("link", { name: "Switch to User dashboard" })
        .getAttribute("href"),
    ).toBe("/dashboard");
  });

  it("does not expose a switch link without admin capability", () => {
    render(<DashboardSwitcher canSwitch={false} destination="admin" />);

    expect(screen.queryByRole("link")).toBeNull();
  });
});
