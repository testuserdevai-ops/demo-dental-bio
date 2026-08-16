import React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type {
  AnalyticsEvent,
  PublicRenderContext,
} from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";

import type { DirectBookingBlogGroup } from "../_lib/direct-booking-template";

mock.module("@/app/components/Image/BlogImage", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const { default: DirectBookingBlogSection } =
  await import("./DirectBookingBlogSection");

const groups: DirectBookingBlogGroup[] = [
  {
    id: 41,
    name: "Appointment guides",
    blogs: [
      {
        id: 401,
        title: "First visit",
        slug: "first-visit",
        imageUrl: "/previews/preview-1.webp",
        position: 1,
      },
      {
        id: 402,
        title: "Booking questions",
        slug: "booking-questions",
        imageUrl: null,
        position: 2,
      },
    ],
  },
  {
    id: 42,
    name: "After your visit",
    blogs: [
      {
        id: 403,
        title: "Aftercare",
        slug: "aftercare",
        imageUrl: null,
        position: 3,
      },
    ],
  },
];

class RecordingTransport implements AnalyticsTransport {
  events: AnalyticsEvent[] = [];
  fail = false;

  async send(event: AnalyticsEvent) {
    this.events.push(event);
    if (this.fail) throw new Error("offline");
    return { status: "dispatched" as const, eventId: event.eventId };
  }
}

const fetchMock = mock(async () => new Response(null, { status: 204 }));
const originalFetch = globalThis.fetch;

function renderSection(
  transport: RecordingTransport,
  renderContext: PublicRenderContext = { kind: "public" },
  blogGroups: readonly DirectBookingBlogGroup[] = groups,
) {
  return render(
    <AnalyticsProvider
      createEventId={() => "11111111-1111-4111-8111-111111111111"}
      now={() => new Date("2026-08-17T12:00:00.000Z")}
      profileId="db010000-0000-4000-8000-000000000001"
      renderContext={renderContext}
      transport={transport}
    >
      <DirectBookingBlogSection
        groups={blogGroups}
        username="template-direct-booking"
      />
    </AnalyticsProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockClear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

describe("DirectBookingBlogSection", () => {
  test("renders every supplied group and post as a native article link", () => {
    renderSection(new RecordingTransport());

    expect(
      screen.getByRole("heading", { name: "Appointment guides" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "After your visit" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: "First visit" }).getAttribute("href"),
    ).toBe("/template-direct-booking/blog/first-visit");
    expect(document.querySelector('img[alt=""]')).toBeTruthy();
  });

  test("tracks immutable identities and global visible position", () => {
    const transport = new RecordingTransport();
    renderSection(transport);
    fireEvent.click(screen.getByRole("link", { name: "Aftercare" }));
    expect(transport.events[0]).toMatchObject({
      section: "blogs",
      position: 3,
      action: { type: "blog_click", blogId: 403, groupId: 42 },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/blogs/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId: 403 }),
    });
  });

  test("preserves preview navigation without mutating the legacy counter", () => {
    const transport = new RecordingTransport();
    renderSection(transport, {
      kind: "preview",
      verification: "authenticated_profile_owner",
    });
    const link = screen.getByRole("link", { name: "Booking questions" });
    expect(link.getAttribute("href")).toBe(
      "/template-direct-booking/blog/booking-questions?analyticsContext=preview",
    );
    expect(fireEvent.click(link)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("does not cancel navigation when tracking fails", async () => {
    const transport = new RecordingTransport();
    transport.fail = true;
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    renderSection(transport);
    const link = screen.getByRole("link", { name: "First visit" });
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    await Promise.resolve();
    expect(link.getAttribute("href")).toBe(
      "/template-direct-booking/blog/first-visit",
    );
  });

  test("renders nothing for an empty eligible inventory", () => {
    const { container } = renderSection(
      new RecordingTransport(),
      { kind: "public" },
      [],
    );
    expect(container.innerHTML).toBe("");
  });
});
