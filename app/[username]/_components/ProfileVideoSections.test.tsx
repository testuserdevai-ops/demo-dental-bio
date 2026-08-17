import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import {
  publicActionSchema,
  type AnalyticsEvent,
} from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";

import type { ProfileVideoGroup } from "../_lib/profile-videos";

const { default: ProfileVideoSections } =
  await import("./ProfileVideoSections");

class RecordingTransport implements AnalyticsTransport {
  events: AnalyticsEvent[] = [];
  fail = false;

  async send(event: AnalyticsEvent) {
    this.events.push(event);
    if (this.fail) throw new Error("offline");
    return { status: "dispatched" as const, eventId: event.eventId };
  }
}

const groups: ProfileVideoGroup[] = [
  {
    id: "101",
    name: "First group",
    rank: 1,
    enabled: true,
    datas: Array.from({ length: 4 }, (_, index) => ({
      id: String(1_001 + index),
      title: `First video ${index + 1}`,
      link: `about:blank#first-video-${index + 1}`,
      rank: index + 1,
      enabled: true as const,
      position: index + 1,
      presentation: {
        kind: "iframe" as const,
        provider: "youtube" as const,
        src: `about:blank#first-video-${index + 1}`,
      },
    })),
  },
  {
    id: "102",
    name: "Second group",
    rank: 2,
    enabled: true,
    datas: [
      {
        id: "2001",
        title: "Native practice tour",
        link: "https://cdn.example.test/practice-tour.webm",
        rank: 1,
        enabled: true,
        position: 1,
        presentation: {
          kind: "native-video",
          src: "https://cdn.example.test/practice-tour.webm",
        },
      },
      ...Array.from({ length: 3 }, (_, index) => ({
        id: String(2_002 + index),
        title: `Second video ${index + 2}`,
        link: `about:blank#second-video-${index + 2}`,
        rank: index + 2,
        enabled: true as const,
        position: index + 2,
        presentation: {
          kind: "iframe" as const,
          provider: "vimeo" as const,
          src: `about:blank#second-video-${index + 2}`,
        },
      })),
    ],
  },
];

function renderSection(transport: RecordingTransport, inventory = groups) {
  return render(
    <AnalyticsProvider
      createEventId={() => "11111111-1111-4111-8111-111111111111"}
      now={() => new Date("2026-08-17T12:00:00.000Z")}
      profileId="db010000-0000-4000-8000-000000000001"
      renderContext={{ kind: "public" }}
      transport={transport}
    >
      <ProfileVideoSections groups={inventory} />
    </AnalyticsProvider>,
  );
}

afterEach(cleanup);

describe("ProfileVideoSections", () => {
  test("renders every supplied group and video without a cap", () => {
    renderSection(new RecordingTransport());

    expect(screen.getByRole("heading", { name: "First group" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Second group" })).toBeTruthy();
    expect(document.querySelectorAll("[data-video-id]")).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Second video 4" })).toBeTruthy();
  });

  test("tracks group-local position and preserves keyboard-open state", async () => {
    const transport = new RecordingTransport();
    renderSection(transport);
    const button = screen.getByRole("button", { name: "Second video 4" });

    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    button.focus();
    await userEvent.keyboard("{Enter}");

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(transport.events[0]).toMatchObject({
      section: "videos",
      position: 4,
      action: { type: "video_open", videoId: 2004, groupId: 102 },
    });
    expect(
      publicActionSchema.safeParse(transport.events[0]?.action).success,
    ).toBe(true);
    expect(screen.getByTitle("Video: Second video 4").getAttribute("src")).toBe(
      "about:blank#second-video-4",
    );
  });

  test("uses accessible native media and leaves the close control untracked", () => {
    const transport = new RecordingTransport();
    renderSection(transport);

    fireEvent.click(
      screen.getByRole("button", { name: "Native practice tour" }),
    );
    expect(screen.getByLabelText("Native practice tour").tagName).toBe("VIDEO");
    expect(transport.events).toHaveLength(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Close Native practice tour" }),
    );
    expect(screen.queryByLabelText("Native practice tour")).toBeNull();
    expect(transport.events).toHaveLength(1);
  });

  test("keeps opening available if tracking fails and hides empty inventory", () => {
    const transport = new RecordingTransport();
    transport.fail = true;
    const { container, rerender } = renderSection(transport);

    expect(
      fireEvent.click(screen.getByRole("button", { name: "First video 1" })),
    ).toBe(true);
    expect(screen.getByTitle("Video: First video 1")).toBeTruthy();

    rerender(
      <AnalyticsProvider
        profileId="db010000-0000-4000-8000-000000000001"
        renderContext={{ kind: "public" }}
        transport={transport}
      >
        <ProfileVideoSections groups={[]} />
      </AnalyticsProvider>,
    );
    expect(container.childElementCount).toBe(0);
  });
});
