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

const { default: ClinicCommerceGallerySection } =
  await import("./ClinicCommerceGallerySection");

const cases = Array.from({ length: 4 }, (_, index) => ({
  id: 1_985_101 + index,
  title: `Smile case ${index + 1}`,
  beforeImageUrl: `/case-${index + 1}-before.webp`,
  afterImageUrl: `/case-${index + 1}-after.webp`,
  beforeLabel: `Before ${index + 1}`,
  afterLabel: `After ${index + 1}`,
  position: index + 1,
}));
const generalImages = Array.from({ length: 4 }, (_, index) => ({
  id: 1_985_201 + index,
  title: `Clinic image ${index + 1}`,
  imageUrl: `/clinic-${index + 1}.webp`,
  position: cases.length + index + 1,
}));

afterEach(() => {
  cleanup();
  track.mockClear();
});

describe("ClinicCommerceGallerySection", () => {
  test("renders every before-and-after case and general image in distinct inventories", () => {
    const { container } = render(
      <ClinicCommerceGallerySection
        cases={cases}
        generalImages={generalImages}
      />,
    );

    expect(
      container.querySelector(
        '[data-profile-module="clinic-commerce-gallery"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelectorAll('[data-gallery-kind="before-after"]'),
    ).toHaveLength(4);
    expect(
      container.querySelectorAll('[data-gallery-kind="general"]'),
    ).toHaveLength(4);
    expect(
      Array.from(container.querySelectorAll("[data-gallery-position]")).map(
        (node) => node.getAttribute("data-gallery-position"),
      ),
    ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(screen.getByText("Before 4")).toBeTruthy();
    expect(screen.getByText("Clinic image 4")).toBeTruthy();
  });

  test("numbers both case images and later general media by unique visible position", () => {
    const targets = [
      {
        name: "Open before 1 image for Smile case 1",
        galleryId: 1_985_101,
        position: 1,
        src: "/case-1-before.webp",
      },
      {
        name: "Open after 1 image for Smile case 1",
        galleryId: 1_985_101,
        position: 2,
        src: "/case-1-after.webp",
      },
      {
        name: "Open image for Clinic image 4",
        galleryId: 1_985_204,
        position: 12,
        src: "/clinic-4.webp",
      },
    ] as const;

    for (const target of targets) {
      cleanup();
      track.mockClear();
      render(
        <ClinicCommerceGallerySection
          cases={cases}
          generalImages={generalImages}
        />,
      );
      const button = screen.getByRole("button", { name: target.name });
      expect(button.tagName).toBe("BUTTON");
      fireEvent.click(button);

      expect(track).toHaveBeenCalledWith({
        section: "gallery",
        position: target.position,
        action: { type: "gallery_open", galleryId: target.galleryId },
      });
      expect(
        publicActionSchema.safeParse(track.mock.calls[0]?.[0].action).success,
      ).toBe(true);
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(screen.queryByText("Expanded profile image")).toBeNull();
      expect(
        screen.getByRole("dialog").querySelector(`img[src="${target.src}"]`),
      ).toBeTruthy();
    }
  });

  test("renders no empty shell when neither gallery type is eligible", () => {
    const { container } = render(
      <ClinicCommerceGallerySection cases={[]} generalImages={[]} />,
    );
    expect(container.childElementCount).toBe(0);
  });
});
