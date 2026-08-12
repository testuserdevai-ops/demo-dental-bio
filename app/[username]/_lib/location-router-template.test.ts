import { describe, expect, test } from "bun:test";

import {
  createLocationRouterBookingHref,
  createLocationRouterEmailHref,
  createLocationRouterPhoneHref,
  createLocationRouterState,
  getLocationRouterCopy,
  getLocationRouterLabel,
  getLocationRouterSummary,
  type LocationRouterLocation,
} from "./location-router-template";

const locations = [
  {
    location_id: "11111111-1111-4111-8111-111111111111",
    locations: {
      business_name: "Harbour Dental",
      full_address: "1 Harbour Road, Brighton BN1 1AA",
      area: "Kemptown",
      city: "Brighton",
      country: "United Kingdom",
      latitude: 50.819,
      longitude: -0.136,
    },
  },
  {
    location_id: "22222222-2222-4222-8222-222222222222",
    locations: {
      business_name: "Northside Clinic",
      full_address: null,
      area: "Hove",
      city: "Brighton",
      country: "United Kingdom",
      latitude: null,
      longitude: null,
    },
  },
] satisfies LocationRouterLocation[];

describe("location router template", () => {
  test("uses the saved template answers to choose copy and a stable default", () => {
    expect(getLocationRouterCopy({ routerKind: "provider" })).toEqual({
      eyebrow: "Choose your care team",
      selectorLabel: "Clinician location",
      introduction:
        "Select the clinic where you would like to meet the right clinician for your care.",
    });

    const state = createLocationRouterState(
      {
        routerKind: "location",
        defaultLocationId: "22222222-2222-4222-8222-222222222222",
      },
      locations,
    );

    expect(state.defaultOptionId).toBe("22222222-2222-4222-8222-222222222222");
    expect(state.recoveredDefault).toBe(false);
    expect(state.options.map(({ id, position }) => [id, position])).toEqual([
      ["11111111-1111-4111-8111-111111111111", 1],
      ["22222222-2222-4222-8222-222222222222", 2],
    ]);
  });

  test("recovers deterministically when a saved location is hidden or deleted", () => {
    const state = createLocationRouterState(
      {
        routerKind: "location",
        defaultLocationId: "33333333-3333-4333-8333-333333333333",
      },
      [locations[0], locations[0], { location_id: null, locations: null }],
    );

    expect(state.options).toHaveLength(1);
    expect(state.defaultOptionId).toBe("11111111-1111-4111-8111-111111111111");
    expect(state.recoveredDefault).toBe(true);
  });

  test("collapses an empty selector without inventing an entity", () => {
    expect(createLocationRouterState({}, [])).toEqual({
      options: [],
      defaultOptionId: null,
      recoveredDefault: false,
    });
  });

  test("creates honest labels and address fallbacks from saved location data", () => {
    expect(getLocationRouterLabel(locations[0].locations!)).toBe(
      "Harbour Dental",
    );
    expect(getLocationRouterSummary(locations[1].locations!)).toBe(
      "Hove, Brighton, United Kingdom",
    );
    expect(
      getLocationRouterSummary({
        ...locations[1].locations!,
        area: null,
        city: null,
        country: null,
      }),
    ).toBe("");
  });

  test("normalizes only safe, usable booking and contact destinations", () => {
    expect(
      createLocationRouterBookingHref({
        booking_link_enabled: true,
        booking_link: "example.com/book",
      }),
    ).toBe("https://example.com/book");
    expect(
      createLocationRouterBookingHref({
        booking_link_enabled: false,
        booking_link: "https://example.com/book",
      }),
    ).toBeNull();
    expect(
      createLocationRouterBookingHref({
        booking_link_enabled: true,
        booking_link: "javascript:alert(1)",
      }),
    ).toBeNull();
    expect(createLocationRouterPhoneHref("+44 (0)20 7946 0123")).toBe(
      "tel:+4402079460123",
    );
    expect(createLocationRouterPhoneHref("123")).toBeNull();
    expect(createLocationRouterEmailHref("hello@example.com")).toBe(
      "mailto:hello@example.com",
    );
    expect(createLocationRouterEmailHref("not-an-email")).toBeNull();
  });
});
