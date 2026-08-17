import React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type {
  AnalyticsEvent,
  PublicRenderContext,
} from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";

import type { CosmeticBlogGroup } from "../_lib/cosmetic-transformation-template";

const { default: CosmeticBlogSection } = await import("./CosmeticBlogSection");

const profileId = "c051e71c-0000-4000-8000-000000000001";
const groups = [
  {
    id: 41,
    name: "Smile planning",
    blogs: [
      {
        id: 401,
        title: "Understanding a smile consultation",
        slug: "understanding-a-smile-consultation",
        imageUrl: "https://example.com/preview-1.webp",
        position: 1,
      },
      {
        id: 402,
        title: "Planning a natural-looking result",
        slug: "planning-a-natural-looking-result",
        imageUrl: null,
        position: 2,
      },
    ],
  },
  {
    id: 42,
    name: "Treatment guides",
    blogs: [
      {
        id: 403,
        title: "Caring for your smile",
        slug: "caring-for-your-smile",
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
  blogGroups: readonly CosmeticBlogGroup[] = groups,
) {
  return render(
    <AnalyticsProvider
      createEventId={() => "11111111-1111-4111-8111-111111111111"}
      now={() => new Date("2026-08-17T00:00:00.000Z")}
      profileId={profileId}
      renderContext={renderContext}
      transport={transport}
    >
      <CosmeticBlogSection
        groups={blogGroups}
        username="template-cosmetic-results"
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

describe("CosmeticBlogSection", () => {
  test("renders every owner group and post as a native article link", () => {
    renderSection(new RecordingTransport());

    expect(
      screen.getByRole("heading", { name: "Smile planning", level: 2 }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Treatment guides", level: 2 }),
    ).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(
      screen
        .getByRole("link", { name: "Understanding a smile consultation" })
        .getAttribute("href"),
    ).toBe(
      "/template-cosmetic-results/blog/understanding-a-smile-consultation",
    );
    expect(document.querySelector('img[alt=""]')).toBeTruthy();
  });

  test("tracks immutable identities and global visible position", () => {
    const transport = new RecordingTransport();
    renderSection(transport);

    fireEvent.click(
      screen.getByRole("link", { name: "Caring for your smile" }),
    );

    expect(transport.events).toHaveLength(1);
    expect(transport.events[0]).toMatchObject({
      profileId,
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

  test("keeps preview links native without mutating the legacy counter", () => {
    const transport = new RecordingTransport();
    renderSection(transport, {
      kind: "preview",
      verification: "authenticated_profile_owner",
    });

    const link = screen.getByRole("link", {
      name: "Planning a natural-looking result",
    });
    expect(link.getAttribute("href")).toBe(
      "/template-cosmetic-results/blog/planning-a-natural-looking-result?analyticsContext=preview",
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

    const link = screen.getByRole("link", {
      name: "Understanding a smile consultation",
    });
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    await Promise.resolve();
    expect(link.getAttribute("href")).toContain(
      "/blog/understanding-a-smile-consultation",
    );
    expect(transport.events).toHaveLength(1);
  });

  test("renders no section for an empty eligible inventory", () => {
    renderSection(new RecordingTransport(), { kind: "public" }, []);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
