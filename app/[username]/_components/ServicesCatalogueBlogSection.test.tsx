import React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type {
  AnalyticsEvent,
  PublicRenderContext,
} from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";

import type { CatalogueBlogGroup } from "../_lib/services-catalogue-template";

mock.module("@/app/components/Image/BlogImage", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const { default: ServicesCatalogueBlogSection } =
  await import("./ServicesCatalogueBlogSection");

const profileId = "5e010000-0000-4000-8000-000000000001";
const groups: CatalogueBlogGroup[] = [
  {
    id: 71,
    name: "Treatment planning",
    blogs: [
      {
        id: 701,
        title: "First planning guide",
        slug: "first-planning-guide",
        imageUrl: "/previews/hero-image-1.webp",
        position: 1,
      },
      {
        id: 702,
        title: "Second planning guide",
        slug: "second-planning-guide",
        imageUrl: null,
        position: 2,
      },
    ],
  },
  {
    id: 72,
    name: "Care at home",
    blogs: [
      {
        id: 703,
        title: "Third planning guide",
        slug: "third-planning-guide",
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
  blogGroups: readonly CatalogueBlogGroup[] = groups,
) {
  return render(
    <AnalyticsProvider
      createEventId={() => "11111111-1111-4111-8111-111111111111"}
      now={() => new Date("2026-08-17T12:00:00.000Z")}
      profileId={profileId}
      renderContext={renderContext}
      transport={transport}
    >
      <ServicesCatalogueBlogSection
        groups={blogGroups}
        username="template-services-catalogue"
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

describe("ServicesCatalogueBlogSection", () => {
  test("renders every owner group and post as a native article link", () => {
    renderSection(new RecordingTransport());

    expect(
      screen.getByRole("heading", { name: "Treatment planning", level: 2 }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Care at home", level: 2 }),
    ).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(
      screen
        .getByRole("link", { name: "First planning guide" })
        .getAttribute("href"),
    ).toBe("/template-services-catalogue/blog/first-planning-guide");
    expect(document.querySelector('img[alt=""]')).toBeTruthy();
  });

  test("tracks immutable identities and the global visible position", () => {
    const transport = new RecordingTransport();
    renderSection(transport);

    fireEvent.click(screen.getByRole("link", { name: "Third planning guide" }));

    expect(transport.events).toHaveLength(1);
    expect(transport.events[0]).toMatchObject({
      profileId,
      section: "blogs",
      position: 3,
      action: { type: "blog_click", blogId: 703, groupId: 72 },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/blogs/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId: 703 }),
    });
  });

  test("keeps preview links native without mutating the legacy counter", () => {
    const transport = new RecordingTransport();
    renderSection(transport, {
      kind: "preview",
      verification: "authenticated_profile_owner",
    });

    const link = screen.getByRole("link", { name: "Second planning guide" });
    expect(link.getAttribute("href")).toBe(
      "/template-services-catalogue/blog/second-planning-guide?analyticsContext=preview",
    );
    expect(fireEvent.click(link)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(transport.events).toHaveLength(1);
  });

  test("does not cancel native navigation when tracking fails", async () => {
    const transport = new RecordingTransport();
    transport.fail = true;
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    renderSection(transport);

    const link = screen.getByRole("link", { name: "First planning guide" });
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    await Promise.resolve();
    expect(link.getAttribute("href")).toBe(
      "/template-services-catalogue/blog/first-planning-guide",
    );
    expect(transport.events).toHaveLength(1);
  });

  test("renders no section for an empty eligible inventory", () => {
    renderSection(new RecordingTransport(), { kind: "public" }, []);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
