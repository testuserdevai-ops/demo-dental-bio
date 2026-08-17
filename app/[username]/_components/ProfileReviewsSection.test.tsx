import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import {
  publicActionSchema,
  type TrackableAction,
} from "@/lib/analytics/contract";

const track = mock((_descriptor: TrackableAction) => false);

mock.module("@/app/contexts/AnalyticsContext", () => ({
  useTrackedAction: () => track,
}));
mock.module("@/app/components/Image/SafeImage", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const { default: ProfileReviewsSection } =
  await import("./ProfileReviewsSection");

const reviews = Array.from({ length: 4 }, (_, index) => ({
  id: 701 + index,
  reviewer_name: `Owner reviewer ${index + 1}`,
  content: `Owner review content ${index + 1}`,
  stars: 5 - (index % 2),
  image_url: index === 0 ? "/reviewer.webp" : null,
  platform: `Owner platform ${index + 1}`,
  created_at: `2026-02-0${index + 1}T10:00:00+00:00`,
  enabled: true,
}));

afterEach(() => {
  cleanup();
  track.mockClear();
});

describe("ProfileReviewsSection", () => {
  test("renders an uncapped owner-data-only inventory with stable hooks", () => {
    const { container } = render(
      <ProfileReviewsSection
        externalReviewPages={[]}
        reviews={reviews}
        templateId="clinic-commerce"
      />,
    );

    expect(
      container.querySelector(
        '[data-profile-module="clinic-commerce-reviews"]',
      ),
    ).toBeTruthy();
    expect(
      Array.from(container.querySelectorAll("[data-review-id]")).map((node) => [
        node.getAttribute("data-review-id"),
        node.getAttribute("data-review-position"),
      ]),
    ).toEqual([
      ["701", "1"],
      ["702", "2"],
      ["703", "3"],
      ["704", "4"],
    ]);
    expect(screen.getByText("Owner reviewer 4")).toBeTruthy();
    expect(screen.getByText("Owner review content 4")).toBeTruthy();
    expect(screen.getByText("Owner review content 4").className).toContain(
      "text-card-foreground",
    );
    expect(screen.getByText("Owner platform 4")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Owner reviewer 1" })).toBeTruthy();
    expect(screen.queryByText("Reviews", { exact: true })).toBeNull();
    expect(screen.queryByText("Patient reviews", { exact: true })).toBeNull();
    expect(screen.queryByText(/^Source:/)).toBeNull();
  });

  test("renders and tracks every safe native external link with immutable IDs", () => {
    const { container } = render(
      <ProfileReviewsSection
        externalReviewPages={[
          { id: 901, link: "https://reviews.example/one" },
          { id: 902, link: "https://directory.example/two" },
        ]}
        reviews={reviews.slice(0, 1)}
        templateId="basic"
        variant="plain"
      />,
    );
    const links = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(
        "[data-external-review-page-id]",
      ),
    );

    expect(
      links.map((link) => [
        link.dataset.externalReviewPageId,
        link.dataset.externalReviewPosition,
        link.getAttribute("href"),
        link.getAttribute("target"),
        link.getAttribute("rel"),
      ]),
    ).toEqual([
      [
        "901",
        "1",
        "https://reviews.example/one",
        "_blank",
        "noopener noreferrer",
      ],
      [
        "902",
        "2",
        "https://directory.example/two",
        "_blank",
        "noopener noreferrer",
      ],
    ]);

    document.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    expect(fireEvent.click(links[1]!, { metaKey: true })).toBe(false);
    expect(track).toHaveBeenCalledWith({
      section: "reviews",
      position: 2,
      action: { type: "external_review_click", reviewPageId: 902 },
    });
    expect(
      publicActionSchema.safeParse(track.mock.calls[0]?.[0].action).success,
    ).toBe(true);
  });

  test("keeps external destinations reachable without cards and omits empty shells", () => {
    const { container, rerender } = render(
      <ProfileReviewsSection
        externalReviewPages={[
          { id: 1001, link: "https://reviews.example/only" },
        ]}
        reviews={[]}
        templateId="basic"
      />,
    );

    expect(container.querySelectorAll("[data-review-id]")).toHaveLength(0);
    expect(
      screen.getByRole("link", {
        name: "Open reviews.example reviews in a new tab",
      }),
    ).toBeTruthy();

    rerender(
      <ProfileReviewsSection
        externalReviewPages={[
          { id: 1002, link: "http://reviews.example/unsafe" },
        ]}
        reviews={null}
        templateId="basic"
      />,
    );
    expect(container.childElementCount).toBe(0);
  });
});
