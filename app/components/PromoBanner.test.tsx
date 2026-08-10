import { afterEach, describe, expect, it, mock } from "bun:test";
import * as React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

mock.module("@/utils/hooks/useDomainConfig", () => ({
  useDomainConfig: () => ({ brandName: "DentalBio" }),
}));
mock.module("next/font/google", () => ({
  Manrope: () => ({ className: "manrope" }),
}));
mock.module("./home-page/ClaimForm", () => ({
  default: () => <input aria-label="Claim username" />,
}));

const { default: PromoBanner } = await import("./PromoBanner");

function setScrollPosition(position: number) {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: position,
    writable: true,
  });
}

function renderBanner() {
  return render(
    <>
      <button type="button">Before banner</button>
      <PromoBanner />
    </>,
  );
}

async function openBanner() {
  setScrollPosition(801);
  fireEvent.scroll(window);
  return screen.findByRole("dialog", {
    name: /Claim your unique DentalBio website username today/i,
  });
}

describe("PromoBanner", () => {
  afterEach(() => {
    cleanup();
    setScrollPosition(0);
  });

  it("opens only after the configured scroll threshold and contains focus", async () => {
    renderBanner();
    setScrollPosition(800);
    fireEvent.scroll(window);
    expect(screen.queryByRole("dialog")).toBeNull();

    const dialog = await openBanner();
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    expect(screen.getByLabelText("Claim username")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeTruthy();
  });

  it("closes with Escape, restores focus, and does not reopen after dismissal", async () => {
    renderBanner();
    const origin = screen.getByRole("button", { name: "Before banner" });
    origin.focus();
    const dialog = await openBanner();

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(origin));

    fireEvent.scroll(window);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes from its named close button", async () => {
    renderBanner();
    await openBanner();

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
