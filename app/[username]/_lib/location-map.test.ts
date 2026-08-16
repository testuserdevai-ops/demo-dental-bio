import { describe, expect, test } from "bun:test";

import {
  createExternalDirectionsUrl,
  getLocationLabel,
  getLocationSummary,
} from "./location-map";

const location = {
  business_name: "Harbour Dental & Implant Centre",
  full_address: "1 Harbour Street, London",
  area: "Docklands",
  city: "London",
  country: "United Kingdom",
  latitude: 51.503,
  longitude: -0.09,
  image_url: null,
  image_alt: null,
  image_decorative: true,
};

describe("public location map helpers", () => {
  test("prefers concise saved display data", () => {
    expect(getLocationLabel(location)).toBe("Harbour Dental & Implant Centre");
    expect(getLocationSummary(location)).toBe("1 Harbour Street, London");
  });

  test("builds directions only on the controlled Google Maps origin", () => {
    const url = new URL(createExternalDirectionsUrl(location)!);
    expect(url.origin).toBe("https://www.google.com");
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toBe("51.503,-0.09");
  });

  test("falls back to encoded address context when coordinates are missing", () => {
    const url = new URL(
      createExternalDirectionsUrl({
        ...location,
        latitude: null,
        longitude: null,
      })!,
    );
    expect(url.searchParams.get("destination")).toBe(
      "1 Harbour Street, London",
    );
  });

  test("does not create directions from placeholder copy", () => {
    expect(
      createExternalDirectionsUrl({
        business_name: null,
        full_address: null,
        area: null,
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        image_url: null,
        image_alt: null,
        image_decorative: true,
      }),
    ).toBeNull();
  });
});
