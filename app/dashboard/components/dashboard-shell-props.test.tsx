import { describe, expect, it } from "bun:test";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import type MobileNavbar from "./MobileNavbar";
import type RightPanel from "./RightPanel";
import type RightPanelClient from "./RightPanelClient";
import type Sidebar from "./Sidebar";
import VerifyStatus from "../verification/components/VerifyStatus";

type Shell = {
  subscriptionStatus: string | null;
  isVerified: boolean;
  useDentalBrand: boolean;
};

const shell: Shell = {
  subscriptionStatus: "PREMIUM PRO",
  isVerified: true,
  useDentalBrand: true,
};

describe("dashboard server shell props", () => {
  it("keeps Sidebar, RightPanel, RightPanelClient, and MobileNavbar on the minimal server shell", () => {
    const sidebar: React.ComponentProps<typeof Sidebar> = { shell };
    const rightPanel: React.ComponentProps<typeof RightPanel> = {
      username: "owner",
      shell,
    };
    const panelClient: React.ComponentProps<typeof RightPanelClient> = {
      username: "owner",
      shell,
    };
    const mobileNavbar: React.ComponentProps<typeof MobileNavbar> = { shell };

    expect(sidebar.shell).toBe(shell);
    expect(rightPanel.shell).toBe(shell);
    expect(panelClient.shell).toBe(shell);
    expect(mobileNavbar.shell).toBe(shell);
  });

  it("renders verification presentation directly from the server-derived status", () => {
    render(<VerifyStatus enabled={true} isVerified={true} />);

    expect(screen.getByText("You verified your identity")).toBeTruthy();
  });
});
