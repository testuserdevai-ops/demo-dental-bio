import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";

mock.module("../_lib/actions", () => ({ sendReferralInvite: mock() }));
const { ReferralManager } = await import("./ReferralManager");

describe("ReferralManager", () => {
  it("does not expose the referral URL or invite controls while locked", () => {
    render(
      <ReferralManager
        view={{
          referralUrl: "https://dental.bio/api/invite?referral=hidden-user",
          senderDisplayName: "Hidden user",
          canInvite: false,
        }}
      />,
    );
    expect(screen.queryByLabelText("Referral link")).toBeNull();
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(
      screen.getByText(
        "Upgrade your plan to unlock your personal referral link.",
      ),
    ).toBeTruthy();
  });
});
