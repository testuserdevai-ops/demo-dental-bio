import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfileThemeRoot } from "@/app/components/profile-presentation/ProfileThemeRoot";
import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import { NavbarProvider } from "@/app/contexts/NavbarContext";
import { MemoryAnalyticsTransport } from "@/lib/analytics/transport";
import type { ProfileThemeId } from "@/lib/profile-presentation/catalog";
import WorkLocation from "./WorkLocation";

afterEach(cleanup);

const dentistry = {
  booking_link: "https://booking.example.test/visit",
  booking_link_enabled: true,
  contact_email: "practice@example.test",
  location_title: "Where to find us",
  phone: "+442012345678",
};

const serverLocations = [
  {
    location_id: "10000000-0000-4000-8000-000000000001",
    locations: {
      business_name: "Harbour Dental",
      full_address: "1 Harbour Street, London",
      area: "Docklands",
      city: "London",
      country: "United Kingdom",
      latitude: 51.503,
      longitude: -0.09,
      image_url: "http://localhost:54321/harbour.webp",
      image_alt: "Harbour Dental reception",
      image_decorative: false,
    },
  },
  {
    location_id: "10000000-0000-4000-8000-000000000002",
    locations: {
      business_name: "Riverside Clinic",
      full_address: "22 River Road, Oxford",
      area: "Central",
      city: "Oxford",
      country: "United Kingdom",
      latitude: 51.752,
      longitude: -1.258,
      image_url: null,
      image_alt: null,
      image_decorative: true,
    },
  },
];

function renderLocations(
  transport = new MemoryAnalyticsTransport(),
  locations = serverLocations,
  themeId: ProfileThemeId = "premium-contrast",
) {
  render(
    <AnalyticsProvider
      createEventId={() => "20000000-0000-4000-8000-000000000001"}
      now={() => new Date("2026-08-11T10:00:00.000Z")}
      profileId="30000000-0000-4000-8000-000000000001"
      renderContext={{ kind: "public" }}
      transport={transport}
    >
      <ProfileThemeRoot themeId={themeId}>
        <NavbarProvider>
          <WorkLocation
            dentistry={dentistry as never}
            serverLocations={locations}
          />
        </NavbarProvider>
      </ProfileThemeRoot>
    </AnalyticsProvider>,
  );

  return transport;
}

describe("WorkLocation", () => {
  test("keeps maps lazy, targets the chosen location, and restores focus", async () => {
    const user = userEvent.setup();
    const transport = renderLocations();

    expect(document.querySelector("[data-map-status]")).toBeNull();
    const openButtons = screen.getAllByRole("button", { name: "View map" });
    await user.click(openButtons[1]!);

    const dialog = screen.getByRole("dialog", { name: "Riverside Clinic" });
    expect(dialog.getAttribute("data-profile-theme")).toBe("premium-contrast");
    expect(dialog.style.getPropertyValue("--profile-surface")).toBe("#191f27");
    expect(dialog.style.getPropertyValue("--profile-primary-action")).toBe(
      "#f6c453",
    );
    expect(within(dialog).getByText("22 River Road, Oxford")).toBeTruthy();
    const mapFallback = within(dialog).getByText("Map preview unavailable");
    expect(mapFallback.closest("[data-map-status]")?.className).toContain(
      "bg-[var(--profile-muted)]",
    );
    const directions = within(dialog).getByRole("link", {
      name: /Get directions/,
    });
    expect(directions.className).toContain(
      "bg-[var(--profile-primary-action)]",
    );
    expect(
      within(dialog).getByRole("link", { name: "Call practice" }).className,
    ).toContain("bg-[var(--profile-secondary-action)]");
    const directionsUrl = new URL(directions.getAttribute("href")!);
    expect(directionsUrl.origin).toBe("https://www.google.com");
    expect(directionsUrl.searchParams.get("destination")).toBe("51.752,-1.258");
    expect(directions.getAttribute("target")).toBe("_blank");
    expect(directions.getAttribute("rel")).toBe("noopener noreferrer");

    expect(transport.events[0]?.action).toEqual({
      type: "map_open",
      locationId: "10000000-0000-4000-8000-000000000002",
    });
    expect(transport.events[0]?.position).toBe(2);

    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(openButtons[1]);
  });

  test("preserves native booking, phone, and email links", () => {
    renderLocations();
    const harbour = screen
      .getByRole("heading", {
        name: "Harbour Dental",
      })
      .closest("article")!;

    expect(
      within(harbour).getByRole("link", { name: "Book" }).getAttribute("href"),
    ).toBe("https://booking.example.test/visit");
    expect(
      within(harbour).getByRole("link", { name: "Call" }).getAttribute("href"),
    ).toBe("tel:+442012345678");
    expect(
      within(harbour).getByRole("link", { name: "Email" }).getAttribute("href"),
    ).toBe("mailto:practice@example.test");
  });

  test("uses the shared location policy for UUID ordering and positions", async () => {
    const user = userEvent.setup();
    const transport = renderLocations(undefined, [
      serverLocations[1]!,
      { ...serverLocations[0]!, location_id: "not-a-uuid" },
      serverLocations[0]!,
      serverLocations[1]!,
    ]);

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map(({ textContent }) => textContent),
    ).toEqual(["Harbour Dental", "Riverside Clinic"]);
    await user.click(screen.getAllByRole("button", { name: "View map" })[1]!);
    expect(transport.events[0]?.position).toBe(2);
  });

  test("does not offer directions without a real destination", async () => {
    const user = userEvent.setup();
    renderLocations(undefined, [
      {
        location_id: "10000000-0000-4000-8000-000000000003",
        locations: {
          business_name: null,
          full_address: null,
          area: null,
          city: null,
          country: null,
          latitude: null,
          longitude: null,
        },
      },
    ] as never);

    await user.click(screen.getByRole("button", { name: "View map" }));
    const dialog = screen.getByRole("dialog", { name: "Practice location" });
    expect(
      within(dialog).getByText(
        "Directions are not available for this location yet.",
      ),
    ).toBeTruthy();
    expect(
      within(dialog).queryByRole("link", { name: /Get directions/ }),
    ).toBeNull();
    expect(
      within(dialog)
        .getByRole("link", { name: "Call practice" })
        .getAttribute("href"),
    ).toBe("tel:+442012345678");
  });
});
