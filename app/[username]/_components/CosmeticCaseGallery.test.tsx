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

const { default: CosmeticCaseGallery } = await import("./CosmeticCaseGallery");

const cases = [
  {
    id: 201,
    before_image_url: "/case-one-before.webp",
    after_image_url: "/case-one-after.webp",
    title: "Composite bonding result",
    before_image_label: "Before treatment",
    after_image_label: "After treatment",
  },
  {
    id: 202,
    before_image_url: "/case-two-before.webp",
    after_image_url: "/case-two-after.webp",
    title: "Whitening result",
    before_image_label: "Before",
    after_image_label: "After",
  },
];

afterEach(() => {
  cleanup();
  track.mockClear();
});

describe("CosmeticCaseGallery", () => {
  test("keeps each result paired and offers large non-drag browsing controls", () => {
    render(<CosmeticCaseGallery cases={cases} />);

    expect(
      screen.getByRole("article", {
        name: "Composite bonding result, case 1 of 2",
      }),
    ).toBeTruthy();
    expect(screen.getByText("1 of 2")).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: "Before treatment: Composite bonding result",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: "After treatment: Composite bonding result",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Previous" }).hasAttribute("disabled"),
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next result" }));

    expect(
      screen.getByRole("article", {
        name: "Whitening result, case 2 of 2",
      }),
    ).toBeTruthy();
    expect(screen.getByText("2 of 2")).toBeTruthy();
    expect(track).toHaveBeenCalledWith({
      section: "gallery",
      position: 2,
      action: { type: "gallery_open", galleryId: "202" },
    });
    expect(
      screen
        .getByRole("button", { name: "Next result" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  test("keeps every case beyond the former six-item cap reachable", () => {
    const uncappedCases = Array.from({ length: 8 }, (_, index) => ({
      ...cases[0],
      id: 301 + index,
      title: `Ranked case ${index + 1}`,
      before_image_url: `/ranked-${index + 1}-before.webp`,
      after_image_url: `/ranked-${index + 1}-after.webp`,
    }));

    render(<CosmeticCaseGallery cases={uncappedCases} />);
    const next = screen.getByRole("button", { name: "Next result" });
    for (let index = 1; index < uncappedCases.length; index += 1) {
      fireEvent.click(next);
    }

    expect(
      screen
        .getByRole("article", { name: "Ranked case 8, case 8 of 8" })
        .getAttribute("data-gallery-id"),
    ).toBe("308");
    expect(screen.getByText("8 of 8")).toBeTruthy();
    expect(track).toHaveBeenLastCalledWith({
      section: "gallery",
      position: 8,
      action: { type: "gallery_open", galleryId: "308" },
    });
  });
});
