// @ts-nocheck -- Bun provides its test module at runtime.
import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { AdminIconTooltip } from "./AdminIconTooltip";

afterEach(cleanup);

describe("AdminIconTooltip", () => {
  it("explains an icon-only control on hover without changing its action", async () => {
    const user = userEvent.setup();
    const onClick = mock();

    render(
      <TooltipProvider delayDuration={0}>
        <AdminIconTooltip label="View account details">
          <button
            type="button"
            aria-label="View account details for owner@example.com"
            onClick={onClick}
          >
            icon
          </button>
        </AdminIconTooltip>
      </TooltipProvider>,
    );

    const control = screen.getByRole("button", {
      name: "View account details for owner@example.com",
    });

    await user.hover(control);
    expect((await screen.findByRole("tooltip")).textContent).toContain(
      "View account details",
    );

    await user.click(control);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows the same explanation on keyboard focus", async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider delayDuration={0}>
        <AdminIconTooltip label="Delete user">
          <button type="button" aria-label="Delete owner@example.com">
            icon
          </button>
        </AdminIconTooltip>
      </TooltipProvider>,
    );

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Delete owner@example.com" }),
    );
    expect((await screen.findByRole("tooltip")).textContent).toContain(
      "Delete user",
    );
  });
});
