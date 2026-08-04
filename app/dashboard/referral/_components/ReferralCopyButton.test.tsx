import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReferralCopyButton } from "./ReferralCopyButton";

describe("ReferralCopyButton", () => {
  it("reports success only after the clipboard write resolves", async () => {
    const writeText = mock(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<ReferralCopyButton referralUrl="https://dental.bio/invite" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() =>
      expect(screen.getByText("Referral link copied")).toBeTruthy(),
    );
    expect(writeText).toHaveBeenCalledWith("https://dental.bio/invite");
  });
});
