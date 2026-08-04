import React from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import { BrandDomainProvider } from "@/app/contexts/BrandDomainContext";
import ShareModal from "./ShareModal";

afterEach(cleanup);

describe("ShareModal", () => {
  test("renders crisp vector icons for every share action", () => {
    render(
      <AnalyticsProvider
        profileId="00000000-0000-4000-8000-000000000001"
        renderContext={{ kind: "public" }}
      >
        <BrandDomainProvider brandDomain="dental.bio">
          <ShareModal username="dr-smith" />
        </BrandDomainProvider>
      </AnalyticsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Share profile" }));

    expect(screen.getByRole("button", { name: "Copy dentalbio" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Share on LinkedIn" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Share on Facebook" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Share via Whatsapp" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Share via Messenger" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Share via Email" })).toBeTruthy();
    expect(document.querySelectorAll("svg.modal-icons")).toHaveLength(6);
  });
});
