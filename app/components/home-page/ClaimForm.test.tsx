// @ts-nocheck -- Bun provides test globals at runtime.
import React from "react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { setMockSearchParams } from "@/test/mocks/next-navigation";

const searchParams = new URLSearchParams("referral=Dr%20Ada");
let resolvedDomain = "dental.bio";

mock.module("@/utils/hooks/useDomainConfig", () => ({
  useDomainConfig: () => ({ domain: resolvedDomain }),
}));

const { default: ClaimForm } = await import("./ClaimForm");

const originalFetch = globalThis.fetch;
const originalLocation = window.location;

beforeEach(() => {
  setMockSearchParams(searchParams);
  resolvedDomain = "dental.bio";
});

function mockLocationAssign() {
  const assign = mock(() => undefined);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...originalLocation,
      origin: "http://localhost:3000",
      hostname: "localhost",
      assign,
    },
  });
  return assign;
}

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

describe("claim form", () => {
  it("focuses the username field after client validation fails", async () => {
    render(<ClaimForm />);

    fireEvent.click(screen.getByRole("button", { name: /claim/i }));

    await waitFor(() =>
      expect(screen.getByText(/username must be at least/i)).toBeTruthy(),
    );
    expect(document.activeElement).toBe(screen.getByLabelText("Username"));
  });

  it("preserves the username and focuses a form alert when availability fails", async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error("offline")));
    render(<ClaimForm />);
    const username = screen.getByLabelText("Username");
    fireEvent.change(username, { target: { value: "dr-ada" } });
    fireEvent.click(screen.getByRole("button", { name: /claim/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("We could not check that username");
    expect(username.value).toBe("dr-ada");
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });

  it("builds the local registration URL after a successful claim", async () => {
    const assign = mockLocationAssign();
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ unique: true }),
      }),
    );
    render(<ClaimForm />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "dr-ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /claim/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    expect(assign).toHaveBeenCalledWith(
      "http://localhost:3000/register/?username=dr-ada&domain=dental.bio&referral=Dr+Ada",
    );
  });

  it("adopts a resolved domain until the visitor explicitly chooses another", () => {
    resolvedDomain = "doctors.bio";
    const { rerender } = render(<ClaimForm />);

    expect(
      screen.getByRole("button", { name: /claim doctors\.bio/i }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("combobox", { name: "Profile domain" }));
    fireEvent.click(screen.getByRole("option", { name: "coach.bio" }));
    expect(
      screen.getByRole("button", { name: /claim coach\.bio/i }),
    ).toBeTruthy();

    resolvedDomain = "dental.bio";
    rerender(<ClaimForm />);

    expect(
      screen.getByRole("button", { name: /claim coach\.bio/i }),
    ).toBeTruthy();
  });
});
