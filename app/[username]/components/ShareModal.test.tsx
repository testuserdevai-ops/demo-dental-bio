import React from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrandDomainProvider } from "@/app/contexts/BrandDomainContext";
import ShareModal from "./ShareModal";

afterEach(cleanup);

describe("ShareModal", () => {
  test("renders crisp vector icons for every share action", () => {
    render(
      <BrandDomainProvider brandDomain="dental.bio">
        <ShareModal username="dr-smith" />
      </BrandDomainProvider>,
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
