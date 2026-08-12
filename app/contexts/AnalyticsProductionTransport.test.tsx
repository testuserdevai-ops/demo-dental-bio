import React from "react";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { TrackedButton } from "@/app/components/analytics/TrackedAction";

import { AnalyticsProvider } from "./AnalyticsContext";

const originalSendBeacon = navigator.sendBeacon;

afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: originalSendBeacon,
  });
});

describe("production analytics transport selection", () => {
  test("public context uses the reviewed same-origin endpoint without awaiting the action", () => {
    const beacon = mock((_url: string | URL, _data?: BodyInit | null) => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: beacon,
    });
    render(
      <AnalyticsProvider
        profileId="22222222-2222-4222-8222-222222222222"
        renderContext={{ kind: "public" }}
      >
        <TrackedButton
          analytics={{ section: "share", action: { type: "share_open" } }}
        >
          Share
        </TrackedButton>
      </AnalyticsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]?.[0]).toBe("/api/analytics/events");
  });

  test("verified preview context remains on the disabled transport", () => {
    const beacon = mock((_url: string | URL, _data?: BodyInit | null) => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: beacon,
    });
    render(
      <AnalyticsProvider
        profileId="22222222-2222-4222-8222-222222222222"
        renderContext={{
          kind: "preview",
          verification: "authenticated_profile_owner",
        }}
      >
        <TrackedButton
          analytics={{ section: "share", action: { type: "share_open" } }}
        >
          Preview share
        </TrackedButton>
      </AnalyticsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview share" }));
    expect(beacon).not.toHaveBeenCalled();
  });
});
