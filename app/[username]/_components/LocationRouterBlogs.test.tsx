import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type { AnalyticsEvent } from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";
import {
  createLocationRouterBlogSections,
  type LocationRouterBlogSection,
} from "../_lib/location-router-template";

mock.module("@/app/components/Image/BlogImage", () => ({
  default: ({ src }: { alt: string; src: string | null | undefined }) =>
    src ? <span aria-hidden="true" data-safe-image={src} /> : null,
}));
const { default: LocationRouterBlogs } = await import("./LocationRouterBlogs");

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  mock.restore();
  globalThis.fetch = originalFetch;
});

const sections = [
  {
    id: 20,
    name: "Practice notes",
    blogs: [
      {
        id: 201,
        groupId: 20,
        title: "First article",
        slug: "first-article",
        imageUrl: "/previews/preview-1.webp",
        position: 1,
      },
      {
        id: 202,
        groupId: 20,
        title: "Second article",
        slug: "second-article",
        imageUrl: null,
        position: 2,
      },
      {
        id: 203,
        groupId: 20,
        title: "Third article",
        slug: "third-article",
        imageUrl: null,
        position: 3,
      },
      {
        id: 204,
        groupId: 20,
        title: "Fourth article",
        slug: "fourth-article",
        imageUrl: null,
        position: 4,
      },
    ],
  },
  {
    id: 21,
    name: "Care guides",
    blogs: [
      {
        id: 205,
        groupId: 21,
        title: "Fifth article",
        slug: "fifth-article",
        imageUrl: null,
        position: 1,
      },
    ],
  },
] satisfies LocationRouterBlogSection[];

class RecordingTransport implements AnalyticsTransport {
  readonly events: AnalyticsEvent[] = [];

  constructor(private readonly reject = false) {}

  async send(event: AnalyticsEvent) {
    this.events.push(event);
    if (this.reject) throw new Error("analytics offline");
    return { status: "dispatched" as const, eventId: event.eventId };
  }
}

function renderBlogs({
  renderContext = { kind: "public" } as const,
  transport = new RecordingTransport(),
}: {
  renderContext?:
    | { kind: "public" }
    | {
        kind: "preview";
        verification: "authenticated_profile_owner";
      };
  transport?: AnalyticsTransport;
} = {}) {
  render(
    <AnalyticsProvider
      consent="granted"
      createEventId={() => "33333333-3333-4333-8333-333333333333"}
      now={() => new Date("2026-08-16T20:30:00.000Z")}
      profileId="44444444-4444-4444-8444-444444444444"
      renderContext={renderContext}
      transport={transport}
    >
      <LocationRouterBlogs
        sections={sections}
        username="template-location-router"
      />
    </AnalyticsProvider>,
  );
  return transport;
}

describe("LocationRouterBlogs", () => {
  test("renders every supplied group and post without a fixed cap", () => {
    renderBlogs();

    expect(
      screen.getByRole("heading", { name: "Practice notes" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Care guides" })).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(
      screen.getByRole("link", { name: "Fifth article" }).getAttribute("href"),
    ).toBe("/template-location-router/blog/fifth-article");
    expect(
      screen
        .getByRole("link", { name: "Fourth article" })
        .getAttribute("data-blog-position"),
    ).toBe("4");
    expect(screen.getAllByRole("region")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Practice notes" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Care guides" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Blog posts" })).toBeNull();
  });

  test("keeps a post link when its optional image destination is unsafe", () => {
    const safeSections = createLocationRouterBlogSections([
      {
        id: 30,
        name: "Owner guides",
        enabled: true,
        blogs: [
          {
            id: 301,
            group_id: 30,
            title: "Private media guide",
            slug: "private-media-guide",
            image_url: "https://user:secret@example.com/private.jpg",
            enabled: true,
          },
        ],
      },
    ]);

    render(
      <AnalyticsProvider
        profileId="44444444-4444-4444-8444-444444444444"
        renderContext={{ kind: "public" }}
      >
        <LocationRouterBlogs
          sections={safeSections}
          username="template-location-router"
        />
      </AnalyticsProvider>,
    );

    expect(
      screen
        .getByRole("link", { name: "Private media guide" })
        .getAttribute("href"),
    ).toBe("/template-location-router/blog/private-media-guide");
    expect(document.querySelector("[data-safe-image]")).toBeNull();
  });

  test("tracks stable blog identities and keeps navigation independent of tracking failures", async () => {
    const fetchMock = mock(() => Promise.reject(new Error("counter offline")));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const transport = new RecordingTransport(true);
    renderBlogs({ transport });
    const link = screen.getByRole("link", { name: "Second article" });

    fireEvent.click(link);
    await Promise.resolve();

    expect(link.getAttribute("href")).toBe(
      "/template-location-router/blog/second-article",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/blogs/click",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ blogId: 202 }),
      }),
    );
    expect(transport.events).toHaveLength(1);
    expect(transport.events[0].section).toBe("blogs");
    expect(transport.events[0].position).toBe(2);
    expect(transport.events[0].action).toEqual({
      type: "blog_click",
      blogId: 202,
      groupId: 20,
    });
  });

  test("keeps preview navigation explicit while suppressing public counters", () => {
    const fetchMock = mock(() => Promise.resolve(new Response(null)));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    renderBlogs({
      renderContext: {
        kind: "preview",
        verification: "authenticated_profile_owner",
      },
    });
    const link = screen.getByRole("link", { name: "First article" });

    fireEvent.click(link);

    expect(link.getAttribute("href")).toBe(
      "/template-location-router/blog/first-article?analyticsContext=preview",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("collapses cleanly when no eligible blog sections exist", () => {
    const { container } = render(
      <AnalyticsProvider
        profileId="44444444-4444-4444-8444-444444444444"
        renderContext={{ kind: "public" }}
      >
        <LocationRouterBlogs
          sections={[]}
          username="template-location-router"
        />
      </AnalyticsProvider>,
    );

    expect(container.innerHTML).toBe("");
  });
});
