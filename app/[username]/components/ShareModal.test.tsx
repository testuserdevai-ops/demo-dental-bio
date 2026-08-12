import React from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import { BrandDomainProvider } from "@/app/contexts/BrandDomainContext";
import ShareModal from "./ShareModal";

afterEach(cleanup);

describe("ShareModal", () => {
  test("renders official social logos and a desktop Messenger link", () => {
    (
      window as typeof window & {
        happyDOM: { setURL: (url: string) => void };
      }
    ).happyDOM.setURL("https://dental.bio/dr-smith");

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

    expect(screen.getByRole("dialog", { name: "@dr-smith" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy dentalbio" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Share on LinkedIn" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Share on Facebook" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Share via WhatsApp" }),
    ).toBeTruthy();
    const messengerLink = screen.getByRole("link", {
      name: "Share via Messenger",
    });
    expect(messengerLink.getAttribute("href")).toBe(
      "https://www.messenger.com/new",
    );
    expect(messengerLink.getAttribute("target")).toBe("_blank");
    expect(messengerLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByRole("link", { name: "Share via Email" })).toBeTruthy();
    const socialLogos = Array.from(
      document.querySelectorAll("img[data-social-logo]"),
    );
    expect(socialLogos).toHaveLength(4);
    const expectedSources = [
      "/brand/social/linkedin.png",
      "/brand/social/facebook.png",
      "/brand/social/whatsapp.svg",
      "/brand/social/messenger.png",
    ];
    socialLogos.forEach((logo, index) => {
      expect(decodeURIComponent(logo.getAttribute("src") ?? "")).toContain(
        expectedSources[index]!,
      );
    });
  });
});
