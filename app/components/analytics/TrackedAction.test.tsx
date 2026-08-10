import React, { createRef } from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AnalyticsProvider,
  useLegacyCounterAllowed,
  useTrackedAction,
} from "@/app/contexts/AnalyticsContext";
import type { AnalyticsEvent } from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";
import { TrackedButton, TrackedLink } from "./TrackedAction";

afterEach(cleanup);

const profileId = "22222222-2222-4222-8222-222222222222";
const linkId = "33333333-3333-4333-8333-333333333333";

class RecordingTransport implements AnalyticsTransport {
  readonly events: AnalyticsEvent[] = [];
  fail = false;

  async send(event: AnalyticsEvent) {
    this.events.push(event);
    if (this.fail) throw new Error("offline");
    return { status: "dispatched" as const, eventId: event.eventId };
  }
}

function renderAction(
  transport: RecordingTransport,
  children: React.ReactNode,
) {
  return render(
    <AnalyticsProvider
      profileId={profileId}
      renderContext={{ kind: "public" }}
      consent="granted"
      transport={transport}
      createEventId={() => "11111111-1111-4111-8111-111111111111"}
      now={() => new Date("2026-08-03T20:00:00.000Z")}
    >
      {children}
    </AnalyticsProvider>,
  );
}

describe("tracked public actions", () => {
  test("TrackedLink preserves native attributes and forwards its ref while tracking click and Enter", async () => {
    const transport = new RecordingTransport();
    const ref = createRef<HTMLAnchorElement>();
    renderAction(
      transport,
      <TrackedLink
        ref={ref}
        analytics={{
          section: "links",
          action: { type: "link_click", linkId },
        }}
        href="#document"
        target="_blank"
        download="document.pdf"
        rel="noopener noreferrer"
      >
        Download profile
      </TrackedLink>,
    );
    const link = screen.getByRole("link", { name: "Download profile" });
    expect(ref.current).toBe(link as HTMLAnchorElement);
    expect(link.getAttribute("href")).toBe("#document");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("download")).toBe("document.pdf");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    fireEvent.click(link);
    await Promise.resolve();
    expect(transport.events).toHaveLength(1);
    link.focus();
    await userEvent.keyboard("{Enter}");
    await Promise.resolve();
    expect(transport.events).toHaveLength(2);
  });

  test("tracking failure never cancels a native action", () => {
    const transport = new RecordingTransport();
    transport.fail = true;
    let defaultPrevented = false;
    renderAction(
      transport,
      <TrackedButton
        analytics={{ section: "share", action: { type: "share_open" } }}
        onClick={(event) => {
          defaultPrevented = event.defaultPrevented;
        }}
      >
        Open share
      </TrackedButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open share" }));
    expect(defaultPrevented).toBe(false);
    expect(transport.events).toHaveLength(1);
  });

  test("TrackedLink preserves modified-click state without cancelling navigation", () => {
    const transport = new RecordingTransport();
    let observed = { ctrlKey: false, defaultPrevented: true };
    renderAction(
      transport,
      <TrackedLink
        analytics={{
          section: "links",
          action: { type: "link_click", linkId },
        }}
        href="https://example.invalid"
        onClick={(event) => {
          observed = {
            ctrlKey: event.ctrlKey,
            defaultPrevented: event.defaultPrevented,
          };
        }}
      >
        Modified link
      </TrackedLink>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Modified link" }), {
      ctrlKey: true,
    });
    expect(observed).toEqual({ ctrlKey: true, defaultPrevented: false });
    expect(transport.events).toHaveLength(1);
  });

  test("does not record a consumer-cancelled activation", () => {
    const transport = new RecordingTransport();
    renderAction(
      transport,
      <TrackedLink
        analytics={{
          section: "links",
          action: { type: "link_click", linkId },
        }}
        href="#cancelled"
        onClick={(event) => event.preventDefault()}
      >
        Cancelled link
      </TrackedLink>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Cancelled link" }));
    expect(transport.events).toHaveLength(0);
  });

  test("fails closed for explicitly excluded contexts", () => {
    const transport = new RecordingTransport();
    render(
      <AnalyticsProvider
        profileId={profileId}
        renderContext={{ kind: "excluded", reason: "unverified_preview" }}
        transport={transport}
      >
        <TrackedButton
          analytics={{ section: "share", action: { type: "share_open" } }}
        >
          Excluded action
        </TrackedButton>
      </AnalyticsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Excluded action" }));
    expect(transport.events).toHaveLength(0);
  });

  test("throws when analytics hooks are used without a provider", () => {
    function TrackingProbe() {
      useTrackedAction();
      return null;
    }
    function LegacyCounterProbe() {
      useLegacyCounterAllowed();
      return null;
    }

    expect(() => render(<TrackingProbe />)).toThrow(
      "Missing analytics provider",
    );
    expect(() => render(<LegacyCounterProbe />)).toThrow(
      "Missing analytics provider",
    );
  });

  test("TrackedButton remains a keyboard-operable native button and forwards ref", async () => {
    const transport = new RecordingTransport();
    const ref = createRef<HTMLButtonElement>();
    renderAction(
      transport,
      <TrackedButton
        ref={ref}
        analytics={{ section: "share", action: { type: "share_open" } }}
      >
        Open share
      </TrackedButton>,
    );
    const button = screen.getByRole("button", { name: "Open share" });
    expect(ref.current).toBe(button as HTMLButtonElement);
    expect(button.getAttribute("type")).toBe("button");
    button.focus();
    await userEvent.keyboard("{Enter}");
    await Promise.resolve();
    await userEvent.keyboard(" ");
    await Promise.resolve();
    expect(transport.events).toHaveLength(2);
  });
});
