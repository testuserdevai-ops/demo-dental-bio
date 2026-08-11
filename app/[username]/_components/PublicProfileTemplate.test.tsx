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
});
