import { describe, expect, test } from "bun:test";

import {
  resolveLocationMediaUrl,
  selectProfileLocations,
} from "./profile-locations";

const firstId = "22222222-2222-4222-8222-222222222222";
const secondId = "11111111-1111-4111-8111-111111111111";

const relation = {
  business_name: "Harbour Dental",
  full_address: "1 Harbour Road",
  area: "Kemptown",
  city: "Brighton",
  country: "United Kingdom",
  latitude: 50.819,
  longitude: -0.136,
  image_url: null,
  image_alt: null,
  image_decorative: true,
};

describe("shared profile location selector", () => {
  test("rebases only location-media loopback URLs to the selected stack", () => {
    const path =
      "/storage/v1/object/public/location-images/owner/dentistries/practice/locations/location/image.webp";
    expect(
      resolveLocationMediaUrl(
        `http://127.0.0.1:54321${path}`,
        "http://127.0.0.1:55321",
      ),
    ).toBe(`http://127.0.0.1:55321${path}`);
    expect(
      resolveLocationMediaUrl(
        "https://images.example.test/location.webp",
        "http://127.0.0.1:55321",
      ),
    ).toBe("https://images.example.test/location.webp");
    expect(
      resolveLocationMediaUrl(
        "http://127.0.0.1:54321/storage/v1/object/public/other/image.webp",
        "http://127.0.0.1:55321",
      ),
    ).toBe("http://127.0.0.1:54321/storage/v1/object/public/other/image.webp");
  });

  test("returns rebased relations without mutating persisted rows", () => {
    const source = {
      location_id: firstId,
      locations: {
        ...relation,
        image_url:
          "http://127.0.0.1:54321/storage/v1/object/public/location-images/owner/dentistries/practice/locations/location/image.webp",
      },
    };
    const selected = selectProfileLocations([source], "http://127.0.0.1:55321");
    expect(selected[0]?.locations.image_url).toStartWith(
      "http://127.0.0.1:55321/",
    );
    expect(source.locations.image_url).toStartWith("http://127.0.0.1:54321/");
  });

  test("fails closed, deduplicates relation rows, and orders UUID locations", () => {
    const input = [
      { location_id: firstId, locations: relation },
      null,
      { location_id: "not-a-uuid", locations: relation },
      { location_id: secondId.toUpperCase(), locations: relation },
      { location_id: firstId, locations: { business_name: "Duplicate" } },
      { location_id: "33333333-3333-4333-8333-333333333333", locations: null },
    ];

    expect(
      selectProfileLocations(input).map(({ location_id, position }) => [
        location_id,
        position,
      ]),
    ).toEqual([
      [secondId, 1],
      [firstId, 2],
    ]);
  });

  test("accepts only array input and leaves its source untouched", () => {
    const input = Object.freeze([
      Object.freeze({
        location_id: firstId,
        locations: Object.freeze(relation),
      }),
    ]);

    expect(selectProfileLocations(null)).toEqual([]);
    expect(selectProfileLocations({})).toEqual([]);
    expect(selectProfileLocations(input)[0]).toMatchObject({
      location_id: firstId,
      position: 1,
    });
    expect(input[0]?.locations).toBe(relation);
  });
});
