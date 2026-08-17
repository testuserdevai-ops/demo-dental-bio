import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import { MemoryAnalyticsTransport } from "@/lib/analytics/transport";

import Navbar from "./Navbar";

afterEach(cleanup);

function renderNavbar(shopBehavior?: "toggle" | "navigate") {
  const toggleShopOpen = mock(() => undefined);
  render(
    <AnalyticsProvider
      createEventId={() => "20000000-0000-4000-8000-000000000001"}
      now={() => new Date("2026-08-17T10:00:00.000Z")}
      profileId="30000000-0000-4000-8000-000000000001"
      renderContext={{ kind: "public" }}
      transport={new MemoryAnalyticsTransport()}
    >
      <Navbar
        isFreePlan={false}
        navState={{
          Blog: false,
          Gallery: false,
          Links: false,
          Location: false,
          Reviews: false,
          Shop: true,
          Videos: false,
        }}
        shopBehavior={shopBehavior}
        toggleShopOpen={toggleShopOpen}
      />
    </AnalyticsProvider>,
  );
  return toggleShopOpen;
}

describe("Navbar Shop navigation", () => {
  test("keeps the legacy disclosure button by default", () => {
    renderNavbar();
    expect(screen.getByRole("button", { name: "Shop" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Shop" })).toBeNull();
  });

  test("links to an externally rendered shared Shop section", () => {
    renderNavbar("navigate");
    const link = screen.getByRole("link", { name: "Shop" });
    expect(link.getAttribute("href")).toBe("#shop");
    expect(screen.queryByRole("button", { name: "Shop" })).toBeNull();
  });
});
