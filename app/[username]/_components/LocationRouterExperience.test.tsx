import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type { AnalyticsEvent } from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";
import type { LocationRouterOption } from "../_lib/location-router-template";
import LocationRouterExperience from "./LocationRouterExperience";

afterEach(cleanup);

const options = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    label: "Harbour Dental",
    summary: "1 Harbour Road, Brighton",
    position: 1,
    location: {
      business_name: "Harbour Dental",
      full_address: "1 Harbour Road, Brighton",
      area: "Kemptown",
      city: "Brighton",
      country: "United Kingdom",
      latitude: 50.819,
      longitude: -0.136,
    },
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    label: "Northside Clinic",
    summary: "Hove, Brighton",
    position: 2,
    location: {
      business_name: "Northside Clinic",
      full_address: "2 North Road, Hove",
      area: "Hove",
      city: "Brighton",
      country: "United Kingdom",
      latitude: 50.827,
      longitude: -0.168,
    },
  },
] satisfies LocationRouterOption[];

class RecordingTransport implements AnalyticsTransport {
  readonly events: AnalyticsEvent[] = [];

  async send(event: AnalyticsEvent) {
    this.events.push(event);
    return { status: "dispatched" as const, eventId: event.eventId };
  }
}

function renderRouter(transport = new RecordingTransport()) {
  render(
    <AnalyticsProvider
      consent="granted"
      createEventId={() => "33333333-3333-4333-8333-333333333333"}
      now={() => new Date("2026-08-11T14:30:00.000Z")}
      profileId="44444444-4444-4444-8444-444444444444"
      renderContext={{ kind: "public" }}
      transport={transport}
    >
      <LocationRouterExperience
        contact={{
          bookingHref: "https://example.com/book",
          emailHref: "mailto:hello@example.com",
          phoneHref: "tel:+442079460123",
        }}
        copy={{
          eyebrow: "Choose a practice",
          selectorLabel: "Practice location",
          introduction: "Choose the right practice for your visit.",
        }}
        defaultOptionId={options[0].id}
        options={options}
        recoveredDefault={false}
      />
    </AnalyticsProvider>,
  );
  return transport;
}

describe("LocationRouterExperience", () => {
  test("updates every selected location action through one native selector", async () => {
    const transport = renderRouter();
    const selector = screen.getByRole("combobox", {
      name: "Practice location",
    });
    expect(selector.getAttribute("value")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Harbour Dental" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Book at Harbour Dental/ })
        .getAttribute("href"),
    ).toBe("https://example.com/book");

    fireEvent.change(selector, { target: { value: options[1].id } });
    await Promise.resolve();

    expect(
      screen.getByRole("heading", { name: "Northside Clinic" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "View map" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Book at Northside Clinic/ })
        .getAttribute("href"),
    ).toBe("https://example.com/book");
    expect(transport.events.at(-1)?.action).toEqual({
      type: "location_select",
      locationId: options[1].id,
    });
    expect(transport.events.at(-1)?.position).toBe(2);
  });

  test("keeps every practice in one compact selector without duplicate controls", async () => {
    const transport = renderRouter();
    const selector = screen.getByRole("combobox", {
      name: "Practice location",
    });
    fireEvent.change(selector, { target: { value: options[1].id } });
    await Promise.resolve();

    expect(
      screen.getByRole("heading", { name: "Northside Clinic" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Northside Clinic/ }),
    ).toBeNull();
    expect(transport.events.at(-1)?.action).toEqual({
      type: "location_select",
      locationId: options[1].id,
    });
  });

  test("shows an honest recoverable empty state without fake location actions", () => {
    const transport = new RecordingTransport();
    render(
      <AnalyticsProvider
        profileId="44444444-4444-4444-8444-444444444444"
        renderContext={{ kind: "public" }}
        transport={transport}
      >
        <LocationRouterExperience
          contact={{ bookingHref: null, emailHref: null, phoneHref: null }}
          copy={{
            eyebrow: "Choose a practice",
            selectorLabel: "Practice location",
            introduction: "Choose the right practice for your visit.",
          }}
          defaultOptionId={null}
          options={[]}
          recoveredDefault={false}
        />
      </AnalyticsProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Practice details are being prepared",
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("button", { name: "View map" })).toBeNull();
  });
});
