import React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type {
  AnalyticsEvent,
  PublicRenderContext,
} from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";

import type { SpecialistBlogGroup } from "../_lib/specialist-assessment-template";

const { default: SpecialistBlogSection } =
  await import("./SpecialistBlogSection");

const profileId = "5a5e5500-0000-4000-8000-000000000001";
const groups = [
  {
    id: 81,
    name: "Assessment guides",
    blogs: [
      {
        id: 801,
        title: "Preparing for a specialist assessment",
        slug: "preparing-for-a-specialist-assessment",
        imageUrl: "/previews/preview-1.webp",
        position: 1,
      },
      {
        id: 802,
        title: "Questions to bring to your visit",
        slug: "questions-to-bring-to-your-visit",
        imageUrl: null,
        position: 2,
      },
    ],
  },
  {
    id: 82,
    name: "After your assessment",
    blogs: [
      {
        id: 803,
        title: "Understanding your referral",
        slug: "understanding-your-referral",
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
  blogGroups: readonly SpecialistBlogGroup[] = groups,
) {
  return render(
    <AnalyticsProvider
      createEventId={() => "11111111-1111-4111-8111-111111111111"}
      now={() => new Date("2026-08-17T00:00:00.000Z")}
      profileId={profileId}
      renderContext={renderContext}
      transport={transport}
    >
      <SpecialistBlogSection
        groups={blogGroups}
        username="template-specialist-assessment"
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

describe("SpecialistBlogSection", () => {
  test("renders every owner group and post as a native public article link", () => {
    renderSection(new RecordingTransport());

    expect(
      screen.getByRole("heading", { name: "Assessment guides", level: 3 }),
    ).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(
      screen
        .getByRole("link", { name: "Preparing for a specialist assessment" })
        .getAttribute("href"),
    ).toBe(
      "/template-specialist-assessment/blog/preparing-for-a-specialist-assessment",
    );
  });

  test("tracks immutable blog identities with globally visible positions", () => {
    const transport = new RecordingTransport();
    renderSection(transport);

    fireEvent.click(
      screen.getByRole("link", { name: "Understanding your referral" }),
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
    const previewTransport = new RecordingTransport();
    renderSection(previewTransport, {
      kind: "preview",
      verification: "authenticated_profile_owner",
    });
    const previewLink = screen.getByRole("link", {
      name: "Questions to bring to your visit",
    });
    expect(previewLink.getAttribute("href")).toBe(
      "/template-specialist-assessment/blog/questions-to-bring-to-your-visit?analyticsContext=preview",
    );
    fireEvent.click(previewLink);
    expect(fetchMock).not.toHaveBeenCalled();
    cleanup();

    const failedTransport = new RecordingTransport();
    failedTransport.fail = true;
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    renderSection(failedTransport);
    const publicLink = screen.getByRole("link", {
      name: "Preparing for a specialist assessment",
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
