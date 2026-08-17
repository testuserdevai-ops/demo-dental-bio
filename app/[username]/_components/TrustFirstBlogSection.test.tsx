import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type {
  AnalyticsEvent,
  PublicRenderContext,
} from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";

import type { TrustFirstBlogGroup } from "../_lib/trust-first-template";

mock.module("@/app/components/Image/BlogImage", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const { default: TrustFirstBlogSection } =
  await import("./TrustFirstBlogSection");

const profileId = "7f570000-0000-4000-8000-000000000001";
const groups = [
  {
    id: 81,
    name: "Family visit guides",
    blogs: [
      {
        id: 801,
        title: "Preparing for a first visit",
        slug: "preparing-for-a-first-visit",
        imageUrl: "/previews/preview-1.webp",
        position: 1,
      },
      {
        id: 802,
        title: "Questions children may ask",
        slug: "questions-children-may-ask",
        imageUrl: null,
        position: 2,
      },
    ],
  },
  {
    id: 82,
    name: "Care at home",
    blogs: [
      {
        id: 803,
        title: "A manageable brushing routine",
        slug: "a-manageable-brushing-routine",
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
  blogGroups: readonly TrustFirstBlogGroup[] = groups,
) {
  return render(
    <AnalyticsProvider
      createEventId={() => "11111111-1111-4111-8111-111111111111"}
      now={() => new Date("2026-08-17T00:00:00.000Z")}
      profileId={profileId}
      renderContext={renderContext}
      transport={transport}
    >
      <TrustFirstBlogSection
        groups={blogGroups}
        username="template-trust-first"
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

describe("TrustFirstBlogSection", () => {
  test("renders every owner group and post as a native public article link", () => {
    renderSection(new RecordingTransport());

    expect(
      screen.getByRole("heading", { name: "Family visit guides", level: 2 }),
    ).toBeTruthy();
    expect(screen.queryByText("Helpful family guidance")).toBeNull();
    expect(screen.queryByText("Advice from the practice")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(
      screen
        .getByRole("link", { name: "Preparing for a first visit" })
        .getAttribute("href"),
    ).toBe("/template-trust-first/blog/preparing-for-a-first-visit");
  });

  test("tracks immutable blog identities with globally visible positions", () => {
    const transport = new RecordingTransport();
    renderSection(transport);

    fireEvent.click(
      screen.getByRole("link", { name: "A manageable brushing routine" }),
    );

    expect(transport.events).toHaveLength(1);
    expect(transport.events[0]).toMatchObject({
      profileId,
      section: "blogs",
      position: 3,
      action: { type: "blog_click", blogId: 803, groupId: 82 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("preserves preview exclusions and navigation when tracking fails", async () => {
    renderSection(new RecordingTransport(), {
      kind: "preview",
      verification: "authenticated_profile_owner",
    });
    const previewLink = screen.getByRole("link", {
      name: "Questions children may ask",
    });
    expect(previewLink.getAttribute("href")).toBe(
      "/template-trust-first/blog/questions-children-may-ask?analyticsContext=preview",
    );
    fireEvent.click(previewLink);
    expect(fetchMock).not.toHaveBeenCalled();
    cleanup();

    const failedTransport = new RecordingTransport();
    failedTransport.fail = true;
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    renderSection(failedTransport);
    const publicLink = screen.getByRole("link", {
      name: "Preparing for a first visit",
    });
    expect(fireEvent.click(publicLink, { ctrlKey: true })).toBe(true);
    await Promise.resolve();
    expect(publicLink.getAttribute("href")).toContain("/blog/");
  });

  test("hides the section when no eligible blogs remain", () => {
    renderSection(new RecordingTransport(), { kind: "public" }, []);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
