import { describe, expect, mock, test } from "bun:test";
import { render, screen } from "@testing-library/react";

import type { PublicProfileViewModel } from "../_lib/public-profile";

mock.module("./BasicProfileTemplate", () => ({
  default: ({ username }: { username: string }) => (
    <div data-testid="basic-renderer">{username}</div>
  ),
}));

mock.module("./DirectBookingProfileTemplate", () => ({
  default: ({ username }: { username: string }) => (
    <div data-testid="direct-booking-renderer">{username}</div>
  ),
}));

mock.module("./LocationRouterProfileTemplate", () => ({
  default: ({ username }: { username: string }) => (
    <div data-testid="location-router-renderer">{username}</div>
  ),
}));

const { default: PublicProfileTemplate } =
  await import("./PublicProfileTemplate");

describe("PublicProfileTemplate", () => {
  test("applies one resolved theme boundary around the Basic renderer", () => {
    const profile = {
      presentation: {
        configuration: {
          schemaVersion: 1,
          templateId: "basic",
          themeId: "warm-care",
          layoutVariant: "classic-stack",
          answers: {},
        },
      },
    } as PublicProfileViewModel;

    render(
      <PublicProfileTemplate username="template-basic" profile={profile} />,
    );

    expect(screen.getByTestId("basic-renderer").textContent).toBe(
      "template-basic",
    );
    expect(document.querySelectorAll("[data-profile-theme]")).toHaveLength(1);
    expect(
      document
        .querySelector("[data-profile-theme]")
        ?.getAttribute("data-profile-theme"),
    ).toBe("warm-care");
  });

  test("dispatches Direct Booking inside the same resolved theme boundary", () => {
    const profile = {
      presentation: {
        configuration: {
          schemaVersion: 1,
          templateId: "direct-booking",
          themeId: "modern-specialist",
          layoutVariant: "classic-stack",
          answers: { primaryAction: "booking" },
        },
      },
    } as PublicProfileViewModel;

    render(
      <PublicProfileTemplate
        username="template-direct-booking"
        profile={profile}
      />,
    );

    expect(screen.getByTestId("direct-booking-renderer").textContent).toBe(
      "template-direct-booking",
    );
    expect(screen.queryByTestId("basic-renderer")).toBeNull();
    expect(
      document
        .querySelector("[data-profile-theme]")
        ?.getAttribute("data-profile-theme"),
    ).toBe("modern-specialist");
  });

  test("routes the saved location template through its distinct renderer", () => {
    const profile = {
      presentation: {
        configuration: {
          schemaVersion: 1,
          templateId: "location-provider-router",
          themeId: "warm-care",
          layoutVariant: "classic-stack",
          answers: {
            routerKind: "location",
            defaultLocationId: "11111111-1111-4111-8111-111111111111",
          },
        },
      },
    } as PublicProfileViewModel;

    render(
      <PublicProfileTemplate
        username="template-location-router"
        profile={profile}
      />,
    );

    expect(screen.getByTestId("location-router-renderer").textContent).toBe(
      "template-location-router",
    );
    expect(screen.queryByTestId("basic-renderer")).toBeNull();
    expect(document.querySelectorAll("[data-profile-theme]")).toHaveLength(1);
  });
});
