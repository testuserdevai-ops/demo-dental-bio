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

const { default: CosmeticGeneralGallery } =
  await import("./CosmeticGeneralGallery");

const images = Array.from({ length: 4 }, (_, index) => ({
  id: 501 + index,
  image_url: `/general-${index + 1}.webp`,
  title: `Studio image ${index + 1}`,
}));

afterEach(() => {
  cleanup();
  track.mockClear();
});

describe("CosmeticGeneralGallery", () => {
  test("renders every image and opens the chosen item with stable analytics", () => {
    render(<CosmeticGeneralGallery caseCount={7} images={images} />);

    expect(screen.getAllByRole("figure")).toHaveLength(4);
    expect(
      screen.getAllByRole("button", { name: /^Open Studio image/ }),
    ).toHaveLength(4);

    fireEvent.click(
      screen.getByRole("button", { name: "Open Studio image 3" }),
    );

    expect(screen.getByRole("dialog", { name: "Studio image 3" })).toBeTruthy();
    expect(track).toHaveBeenCalledWith({
      section: "gallery",
      position: 10,
      action: { type: "gallery_open", galleryId: "503" },
    });
  });
});
