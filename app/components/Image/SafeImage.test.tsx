import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import SafeImage, { safeMediaSrc } from "./SafeImage";

describe("SafeImage", () => {
  it("does not render an image for blank sources", () => {
    const view = render(
      <SafeImage src="" alt="Blank" width={100} height={100} />,
    );

    expect(view.container.querySelector("img")).toBeNull();
  });

  it("preserves valid sources", () => {
    const source =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    const view = render(
      <SafeImage
        src={source}
        alt="Profile"
        width={100}
        height={100}
        unoptimized
      />,
    );

    expect(view.getByAltText("Profile").getAttribute("src")).toBe(source);
  });
});

describe("safeMediaSrc", () => {
  it("returns undefined only for missing or blank sources", () => {
    expect(safeMediaSrc("")).toBeUndefined();
    expect(safeMediaSrc("   ")).toBeUndefined();
    expect(safeMediaSrc(null)).toBeUndefined();
    expect(safeMediaSrc("/image.webp")).toBe("/image.webp");
  });
});
