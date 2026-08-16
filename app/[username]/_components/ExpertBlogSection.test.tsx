import React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type {
  AnalyticsEvent,
  PublicRenderContext,
} from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";

mock.module("@/app/components/Image/BlogImage", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const { default: ExpertBlogSection } = await import("./ExpertBlogSection");

const profileId = "ed0ca700-0000-4000-8000-000000000001";
const groups = [
  {
    id: 51,
    name: "Patient evidence",
    blogs: [
      {
        id: 501,
        title: "First evidence article",
        slug: "first-evidence-article",
        imageUrl: "/first.webp",
        position: 1,
      },
      {
        id: 502,
        title: "Second evidence article",
        slug: "second-evidence-article",
        imageUrl: null,
        position: 2,
      },
    ],
  },
  {
    id: 52,
    name: "Professional evidence",
    blogs: [
      {
        id: 503,
        title: "Third evidence article",
        slug: "third-evidence-article",
        imageUrl: null,
        position: 3,
      },
    ],
  },
] as const;

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
) {
  return render(
    <AnalyticsProvider
      createEventId={() => "11111111-1111-4111-8111-111111111111"}
      now={() => new Date("2026-08-16T20:00:00.000Z")}
      profileId={profileId}
      renderContext={renderContext}
      transport={transport}
    >
      <ExpertBlogSection groups={groups} username="template-expert-educator" />
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

describe("ExpertBlogSection", () => {
  test("renders every group and post as a native public article link", () => {
    renderSection(new RecordingTransport());

    expect(
      screen.getByRole("heading", { name: "Patient evidence", level: 2 }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Professional evidence",
        level: 2,
      }),
    ).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(
      screen
        .getByRole("link", { name: "First evidence article" })
        .getAttribute("href"),
    ).toBe("/template-expert-educator/blog/first-evidence-article");
    expect(document.querySelector('img[alt=""]')?.getAttribute("src")).toBe(
      "/first.webp",
    );
  });

  test("emits immutable group/post identities and global visible position", () => {
    const transport = new RecordingTransport();
    renderSection(transport);

    fireEvent.click(
      screen.getByRole("link", { name: "Third evidence article" }),
    );

    expect(transport.events).toHaveLength(1);
    expect(transport.events[0]).toMatchObject({
      profileId,
      section: "blogs",
      position: 3,
      action: { type: "blog_click", blogId: 503, groupId: 52 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/blogs/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId: 503 }),
    });
  });

  test("keeps preview links native while excluding the legacy public counter", () => {
    const transport = new RecordingTransport();
    renderSection(transport, {
      kind: "preview",
      verification: "authenticated_profile_owner",
    });

    const link = screen.getByRole("link", { name: "Second evidence article" });
    expect(link.getAttribute("href")).toBe(
      "/template-expert-educator/blog/second-evidence-article?analyticsContext=preview",
    );
    expect(fireEvent.click(link)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(transport.events).toHaveLength(1);
  });

  test("does not cancel navigation when analytics and legacy tracking fail", async () => {
    const transport = new RecordingTransport();
    transport.fail = true;
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    renderSection(transport);

    const link = screen.getByRole("link", { name: "First evidence article" });
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    await Promise.resolve();
    expect(link.getAttribute("href")).toBe(
      "/template-expert-educator/blog/first-evidence-article",
    );
    expect(transport.events).toHaveLength(1);
  });

  test("renders nothing for an empty eligible inventory", () => {
    const transport = new RecordingTransport();
    render(
      <AnalyticsProvider
        profileId={profileId}
        renderContext={{ kind: "public" }}
        transport={transport}
      >
        <ExpertBlogSection groups={[]} username="template-expert-educator" />
      </AnalyticsProvider>,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
