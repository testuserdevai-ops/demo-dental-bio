import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import LocationImage, { getLocationImagePresentation } from "./LocationImage";

const location = {
  business_name: "Harbour Dental",
  full_address: "1 Harbour Road",
  area: "Kemptown",
  city: "Brighton",
  country: "United Kingdom",
  latitude: 50.819,
  longitude: -0.136,
  image_url: "http://localhost:54321/harbour.webp",
  image_alt: "Bright reception at Harbour Dental",
  image_decorative: false,
};

afterEach(cleanup);

describe("LocationImage", () => {
  test("uses the owning location's informative alt text", () => {
    render(<LocationImage location={location} />);
    expect(
      screen.getByRole("img", {
        name: "Bright reception at Harbour Dental",
      }),
    ).toBeTruthy();
  });

  test("renders decorative media with exactly empty alt text", () => {
    const view = render(
      <LocationImage
        location={{ ...location, image_alt: null, image_decorative: true }}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(view.container.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  test("drops unsafe and malformed legacy presentation states", () => {
    expect(
      getLocationImagePresentation({
        ...location,
        image_url: "https://user:secret@storage.test/harbour.webp",
      }),
    ).toBeNull();
    expect(
      getLocationImagePresentation({
        ...location,
        image_alt: null,
        image_decorative: false,
      }),
    ).toBeNull();
  });
});
