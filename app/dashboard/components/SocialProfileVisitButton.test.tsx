// @ts-nocheck -- Bun provides the test runtime and Happy DOM supplies browser globals.
import React from "react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SocialProfileVisitButton from "./SocialProfileVisitButton";

afterEach(cleanup);

describe("social profile visit action", () => {
  it("is enabled for an @handle", () => {
    render(<SocialProfileVisitButton platform="twitter" value="@DentalBio" />);

    expect(
      screen
        .getByRole("button", { name: "Visit X profile" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("is disabled for a blank or bare username", () => {
    const view = render(
      <SocialProfileVisitButton platform="instagram" value="" />,
    );
    expect(
      screen
        .getByRole("button", { name: "Visit Instagram profile" })
        .hasAttribute("disabled"),
    ).toBe(true);

    view.rerender(
      <SocialProfileVisitButton platform="instagram" value="dentalbio" />,
    );
    expect(
      screen
        .getByRole("button", { name: "Visit Instagram profile" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("opens the normalized URL without exposing the opener", () => {
    const openedWindow = { opener: {} };
    const open = mock(() => openedWindow);
    Object.defineProperty(window, "open", { configurable: true, value: open });
    render(<SocialProfileVisitButton platform="tiktok" value="@DentalBio" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Visit TikTok profile" }),
    );

    expect(open).toHaveBeenCalledWith(
      "https://www.tiktok.com/@DentalBio",
      "_blank",
      "noopener,noreferrer",
    );
    expect(openedWindow.opener).toBeNull();
  });
});
