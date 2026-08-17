import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const track = mock(() => true);

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

    expect(screen.getByRole("region", { name: "Gallery" })).toBeTruthy();
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

  test("opens media through the controlled gallery descriptor", () => {
    render(
      <ClinicCommerceGallerySection
        cases={cases}
        generalImages={generalImages}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open gallery image for Clinic image 4",
      }),
    );

    expect(track).toHaveBeenCalledWith({
      section: "gallery",
      position: 8,
      action: { type: "gallery_open", galleryId: "1985204" },
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "Clinic image 4" }).getAttribute("src"),
    ).toBe("/clinic-4.webp");
  });

  test("renders no empty shell when neither gallery type is eligible", () => {
    const { container } = render(
      <ClinicCommerceGallerySection cases={[]} generalImages={[]} />,
    );
    expect(container.childElementCount).toBe(0);
  });
});
