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

mock.module("@/app/contexts/NavbarContext", () => ({
  useNavbar: () => ({ setNavItemState: () => undefined }),
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

function renderProfile(profile: PublicProfileViewModel) {
  return render(
    <AnalyticsProvider
      profileId="00000000-0000-4000-8000-000000000001"
      renderContext={{ kind: "excluded", reason: "unverified_preview" }}
    >
      <DirectBookingProfileTemplate
        profile={profile}
        username="booking-owner"
      />
    </AnalyticsProvider>,
  );
}

afterEach(cleanup);

describe("DirectBookingProfileTemplate inventory headings", () => {
  test("renders every ordered review and the safe external destination", () => {
    const profile = profileWith([]);
    profile.reviews = Array.from({ length: 4 }, (_, index) => ({
      id: 101 + index,
      reviewer_name: `Booking reviewer ${index + 1}`,
      content: `Booking review ${index + 1}`,
      stars: 5,
      image_url: null,
      platform: "Google",
      created_at: `2026-01-0${index + 1}T09:00:00.000Z`,
      rank: index + 1,
      enabled: true,
    })) as never;
    profile.externalReviewPages = [
      { id: 201, link: "https://reviews.example/direct-booking" },
    ] as never;

    const { container } = renderProfile(profile);
    expect(
      Array.from(container.querySelectorAll("[data-review-id]")).map((node) => [
        node.getAttribute("data-review-id"),
        node.getAttribute("data-review-position"),
      ]),
    ).toEqual([
      ["101", "1"],
      ["102", "2"],
      ["103", "3"],
      ["104", "4"],
    ]);
    expect(
      container
        .querySelector(
          '[data-profile-module="direct-booking-reviews"] [data-external-review-page-id="201"]',
        )
        ?.getAttribute("href"),
    ).toBe("https://reviews.example/direct-booking");
  });

  test("integrates every eligible blog group and post with the owner username", () => {
    renderProfile({
      ...profileWith([]),
      blogGroups: [
        {
          id: 41,
          name: "Appointment guides",
          enabled: true,
          blogs: Array.from({ length: 4 }, (_, index) => ({
            id: 401 + index,
            group_id: 41,
            title: `Guide ${index + 1}`,
            slug: `guide-${index + 1}`,
            image_url: null,
            enabled: true,
          })),
        },
      ],
    } as never);

    expect(
      screen.getByRole("heading", { name: "Appointment guides", level: 2 }),
    ).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /^Guide / })).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: "Guide 4" }).getAttribute("href"),
    ).toBe("/booking-owner/blog/guide-4?analyticsContext=preview");
  });

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

  test("renders the service inventory when no treatment inventory is eligible", () => {
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
    expect(screen.getAllByRole("heading", { name: serviceTitle })).toHaveLength(
      1,
    );
    expect(document.querySelector("#services")).toBeTruthy();
  });

  test("uses location-owned media instead of the first general-gallery image", () => {
    const profile = profileWith([]);
    profile.locations = [
      {
        location_id: "00000000-0000-4000-8000-000000000010",
        locations: {
          business_name: "Owner clinic",
          full_address: "1 Owner Street",
          area: "Central",
          city: "London",
          country: "United Kingdom",
          latitude: 51.5,
          longitude: -0.1,
          image_url: "https://storage.test/location.webp",
          image_alt: "Owner clinic entrance",
          image_decorative: false,
        },
      },
    ];
    profile.generalGalleries = [
      {
        id: 1,
        image_url: "https://storage.test/unrelated-gallery.webp",
        title: "Unrelated gallery image",
      },
    ];
    const { container } = renderProfile(profile);
    expect(
      screen.getByRole("img", { name: "Owner clinic entrance" }),
    ).toBeTruthy();
    expect(
      container
        .querySelector("#location")
        ?.querySelector('[aria-label="Unrelated gallery image"]'),
    ).toBeNull();
    expect(
      container
        .querySelector('[data-profile-module="direct-booking-gallery"]')
        ?.querySelector('[aria-label="Unrelated gallery image"]'),
    ).toBeTruthy();
  });

  test("renders every shared video, product, and UUID-ordered location", () => {
    const profile = profileWith([]);
    profile.videoGroups = [
      {
        id: "1710101",
        name: "Direct Booking video group A",
        enabled: true,
        datas: [1, 2].map((position) => ({
          id: String(1710200 + position),
          title: `Direct Booking video ${position}`,
          enabled: true,
          position,
          presentation: {
            kind: "embed",
            provider: "youtube",
            src: `https://www.youtube.com/embed/video-${position}`,
          },
        })),
      },
    ] as never;
    profile.products = [1, 2, 3, 4].map((position) => ({
      id: String(1710300 + position),
      name: `Direct Booking product ${position}`,
      link: `https://seller.example.com/direct/${position}`,
      enabled: true,
      position,
    })) as never;
    profile.locations = [23, 3, 13].map((suffix) => ({
      location_id: `db010000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
      locations: {
        business_name: `Direct Booking location ${(suffix - 3) / 10 + 1}`,
        full_address: `${suffix} Owner Street`,
        country: "United Kingdom",
        city: "London",
        area: "Central",
        latitude: 51.5,
        longitude: -0.1,
        image_url: null,
        image_alt: null,
        image_decorative: false,
      },
    })) as never;

    const { container } = renderProfile(profile);
    expect(
      Array.from(container.querySelectorAll("[data-video-id]"), (node) => [
        node.getAttribute("data-video-id"),
        node.getAttribute("data-video-position"),
      ]),
    ).toEqual([
      ["1710201", "1"],
      ["1710202", "2"],
    ]);
    expect(
      Array.from(container.querySelectorAll("[data-product-id]"), (node) => [
        node.getAttribute("data-product-id"),
        node.getAttribute("data-product-position"),
      ]),
    ).toEqual([
      ["1710301", "1"],
      ["1710302", "2"],
      ["1710303", "3"],
      ["1710304", "4"],
    ]);
    expect(
      Array.from(
        container.querySelectorAll("[id^=location-wrapper-]"),
        (node) => node.id.replace("location-wrapper-", ""),
      ),
    ).toEqual([
      "db010000-0000-4000-8000-000000000003",
      "db010000-0000-4000-8000-000000000013",
      "db010000-0000-4000-8000-000000000023",
    ]);
  });
});
