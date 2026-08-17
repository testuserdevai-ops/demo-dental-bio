import { describe, expect, test } from "bun:test";

import { selectProfileLocations } from "./profile-locations";

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
