import React from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type { AnalyticsEvent } from "@/lib/analytics/contract";
import { MemoryAnalyticsTransport } from "@/lib/analytics/transport";

import { PublicProfileViewTracker } from "./PublicProfileViewTracker";

const profileId = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

function renderTracker(
  transport: MemoryAnalyticsTransport,
  renderContext:
    | { kind: "public" }
    | {
        kind: "preview";
        verification: "authenticated_profile_owner";
      } = { kind: "public" },
) {
  return render(
    <AnalyticsProvider
      profileId={profileId}
      renderContext={renderContext}
      consent="not_required"
      transport={transport}
      createEventId={() => "11111111-1111-4111-8111-111111111111"}
      now={() => new Date("2026-08-12T00:00:00.000Z")}
    >
      <PublicProfileViewTracker profileId={profileId} />
    </AnalyticsProvider>,
  );
}

describe("PublicProfileViewTracker", () => {
  test("records exactly one controlled view per profile in a browser session", async () => {
    const transport = new MemoryAnalyticsTransport();
    const first = renderTracker(transport);
    await Promise.resolve();
    first.unmount();
    renderTracker(transport);
    await Promise.resolve();

    expect(transport.events).toHaveLength(1);
    expect(transport.events[0]).toMatchObject({
      profileId,
      section: "profile",
      consent: "not_required",
      action: { type: "profile_view" },
      client: { deviceClass: "unknown" },
    } satisfies Partial<AnalyticsEvent>);
    expect(transport.events[0]?.client?.anonymousVisitorId).toBeUndefined();
    expect(transport.events[0]?.client?.sessionId).toBeUndefined();
  });

  test("never records owner preview traffic", async () => {
    const transport = new MemoryAnalyticsTransport();
    renderTracker(transport, {
      kind: "preview",
      verification: "authenticated_profile_owner",
    });
    await Promise.resolve();
    expect(transport.events).toHaveLength(0);
  });
});
