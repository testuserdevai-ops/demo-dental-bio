import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import {
  publicActionSchema,
  type TrackableAction,
} from "@/lib/analytics/contract";

const track = mock((_descriptor: TrackableAction) => true);

mock.module("@/app/contexts/AnalyticsContext", () => ({
  useTrackedAction: () => track,
}));
mock.module("@/app/components/Image/SafeImage", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const { default: ProfileGallerySection } =
  await import("./ProfileGallerySection");

const cases = Array.from({ length: 4 }, (_, index) => ({
  id: 101 + index,
  title: `Case ${index + 1}`,
  beforeImageUrl: `/case-${index + 1}-before.webp`,
  afterImageUrl: `/case-${index + 1}-after.webp`,
  beforeLabel: `Before ${index + 1}`,
  afterLabel: `After ${index + 1}`,
  position: index + 1,
}));
const generalImages = Array.from({ length: 5 }, (_, index) => ({
  id: 201 + index,
  title: `Practice image ${index + 1}`,
  imageUrl: `/practice-${index + 1}.webp`,
  position: cases.length + index + 1,
}));

afterEach(() => {
  cleanup();
  track.mockClear();
});

describe("ProfileGallerySection", () => {
  test("renders uncapped before-after and general inventories without static headings", () => {
    const { container } = render(
      <ProfileGallerySection
        cases={cases}
        generalImages={generalImages}
        moduleId="direct-booking-gallery"
      />,
    );

    expect(
      container.querySelector('[data-profile-module="direct-booking-gallery"]'),
    ).toBeTruthy();
    expect(
      container.querySelectorAll('[data-gallery-kind="before-after"]'),
    ).toHaveLength(4);
    expect(
      container.querySelectorAll('[data-gallery-kind="general"]'),
    ).toHaveLength(5);
    expect(
      Array.from(container.querySelectorAll("[data-gallery-position]")).map(
        (node) => node.getAttribute("data-gallery-position"),
      ),
    ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    expect(screen.queryByText("Gallery")).toBeNull();
    expect(screen.queryByText("General gallery")).toBeNull();
    expect(screen.getByText("Before 4")).toBeTruthy();
    expect(screen.getByText("Practice image 5")).toBeTruthy();
  });

  test("opens media through the controlled descriptor with visible position", () => {
    render(
      <ProfileGallerySection
        cases={cases}
        generalImages={generalImages}
        moduleId="expert-educator-gallery"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open image for Practice image 5",
      }),
    );

    expect(track).toHaveBeenCalledWith({
      section: "gallery",
      position: 9,
      action: { type: "gallery_open", galleryId: 205 },
    });
    expect(
      publicActionSchema.safeParse(track.mock.calls[0]?.[0].action).success,
    ).toBe(true);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "Practice image 5" }).getAttribute("src"),
    ).toBe("/practice-5.webp");
  });

  test("renders no empty shell", () => {
    const { container } = render(
      <ProfileGallerySection
        cases={[]}
        generalImages={[]}
        moduleId="location-provider-router-gallery"
      />,
    );
    expect(container.childElementCount).toBe(0);
  });
});
