import React from "react";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type { PublicProfileViewModel } from "../_lib/public-profile";

mock.module("@/app/components/Image/SafeImage", () => ({
  default: ({ alt }: { alt: string }) => <span aria-label={alt} role="img" />,
  safeMediaSrc: (source: string | null | undefined) =>
    source?.trim() ? source : undefined,
}));

const { default: DirectBookingProfileTemplate } =
  await import("./DirectBookingProfileTemplate");

const treatmentTitle = "Owner booking treatments";
const serviceTitle = "Owner booking services";

function profileWith(
  treatments: PublicProfileViewModel["treatments"],
): PublicProfileViewModel {
  return {
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      first_name: "Casey",
      last_name: "Owner",
      position: "Dentist",
    },
    dentistry: {
      about_title: "Book with confidence",
      booking_link_enabled: false,
      treatment_section_title: treatmentTitle,
      service_section_title: serviceTitle,
    },
    profileImageUrl: "http://localhost:3000/profile.webp",
    presentation: {
      configuration: {
        schemaVersion: 1,
        templateId: "direct-booking",
        themeId: "clinical-light",
        layoutVariant: "classic-stack",
        answers: { featuredTreatmentIds: [] },
      },
    },
    treatments,
    linkGroups: [],
    reviews: [],
    externalReviewPages: [],
    locations: [],
    galleries: [],
    generalGalleries: [],
    products: [],
    blogGroups: [],
    videoGroups: [],
    socials: null,
  } as unknown as PublicProfileViewModel;
}

function renderInventory(treatments: PublicProfileViewModel["treatments"]) {
  return render(
    <AnalyticsProvider
      profileId="00000000-0000-4000-8000-000000000001"
      renderContext={{ kind: "excluded", reason: "unverified_preview" }}
    >
      <DirectBookingProfileTemplate
        profile={profileWith(treatments)}
        username="booking-owner"
      />
    </AnalyticsProvider>,
  );
}

afterEach(cleanup);

describe("DirectBookingProfileTemplate inventory headings", () => {
  test("uses the exact treatment heading once for rendered treatment inventory", () => {
    renderInventory([
      {
        treatment_id: "t-1",
        rank: 1,
        treatments: {
          title: "Dental implants",
          description: "Owner-authored detail.",
          isService: false,
        },
      },
    ] as never);
    expect(
      screen.getAllByRole("heading", { name: treatmentTitle }),
    ).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: serviceTitle })).toBeNull();
  });

  test("does not render either inventory heading when no treatment inventory is eligible", () => {
    renderInventory([
      {
        treatment_id: "s-1",
        rank: 1,
        treatments: {
          title: "Consultation support",
          description: null,
          isService: true,
        },
      },
    ] as never);
    expect(screen.queryByRole("heading", { name: treatmentTitle })).toBeNull();
    expect(screen.queryByRole("heading", { name: serviceTitle })).toBeNull();
  });
});
