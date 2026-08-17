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
  useNavbar: () => ({ navState: {}, setNavItemState: () => {} }),
}));

const { default: ClinicCommerceProfileTemplate } =
  await import("./ClinicCommerceProfileTemplate");

const treatmentTitle = "Owner clinic treatments";
const serviceTitle = "Owner clinic services";

function inventory(id: string, rank: number, kind: "treatment" | "service") {
  return {
    treatment_id: id,
    rank,
    treatments: {
      title: `${kind} ${rank}`,
      description: `${kind} description`,
      isService: kind === "service",
    },
  };
}

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
      about_title: "Clinic and shop",
      about_text: "Owner-authored introduction.",
      booking_link: "https://example.com/book",
      booking_link_enabled: true,
      treatment_section_title: treatmentTitle,
      service_section_title: serviceTitle,
    },
    profileImageUrl: "http://localhost:3000/profile.webp",
    presentation: {
      configuration: {
        schemaVersion: 1,
        templateId: "clinic-commerce",
        themeId: "clinical-light",
        layoutVariant: "classic-stack",
        answers: { defaultAudience: "clinic-first" },
      },
    },
    treatments,
    products: [],
    reviews: [],
    linkGroups: [],
    locations: [],
    galleries: [],
    generalGalleries: [],
    externalReviewPages: [],
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
      <ClinicCommerceProfileTemplate
        profile={profileWith(treatments)}
        username="commerce-owner"
      />
    </AnalyticsProvider>,
  );
}

afterEach(cleanup);

describe("ClinicCommerceProfileTemplate inventory headings", () => {
  test("renders every strict location, video, and featured-first product without changing audience order", () => {
    const base = profileWith([]);
    const nextWaveProfile = {
      ...base,
      presentation: {
        ...base.presentation,
        configuration: {
          ...base.presentation.configuration,
          answers: { defaultAudience: "shop", featuredProductId: "103" },
        },
      },
      products: [
        {
          id: "101",
          name: "Product one",
          link: "https://example.com/one",
          rank: 1,
          enabled: true,
        },
        {
          id: "102",
          name: "Product two",
          link: "https://example.com/two",
          rank: 1,
          enabled: true,
        },
        {
          id: "103",
          name: "Product three",
          link: "https://example.com/three",
          rank: 2,
          enabled: true,
        },
        {
          id: "104",
          name: "Product four",
          link: "https://example.com/four",
          rank: 2,
          enabled: true,
        },
      ],
      videoGroups: [
        {
          id: "201",
          name: "Owner video group",
          rank: 1,
          enabled: true,
          datas: [
            {
              id: "301",
              title: "Video one",
              link: "https://youtu.be/M1HinlfYA04",
              rank: 1,
              enabled: true,
            },
            {
              id: "302",
              title: "Video two",
              link: "https://vimeo.com/76979871",
              rank: 1,
              enabled: true,
            },
          ],
        },
      ],
      locations: [
        "00000000-0000-4000-8000-000000000103",
        "00000000-0000-4000-8000-000000000101",
        "00000000-0000-4000-8000-000000000102",
      ].map((location_id, index) => ({
        location_id,
        locations: {
          business_name: `Clinic location ${index + 1}`,
          full_address: `${index + 1} Clinic Street`,
          country: "United Kingdom",
          city: "London",
          area: null,
          latitude: 51.5,
          longitude: -0.1,
          image_url: null,
          image_alt: null,
          image_decorative: true,
        },
      })),
    } as unknown as PublicProfileViewModel;

    const view = render(
      <AnalyticsProvider
        profileId={nextWaveProfile.user.id}
        renderContext={{ kind: "excluded", reason: "unverified_preview" }}
      >
        <ClinicCommerceProfileTemplate
          profile={nextWaveProfile}
          username="commerce-owner"
        />
      </AnalyticsProvider>,
    );

    expect(
      Array.from(view.container.querySelectorAll("[data-product-id]")).map(
        (node) => [
          node.getAttribute("data-product-id"),
          node.getAttribute("data-product-position"),
        ],
      ),
    ).toEqual([
      ["103", "1"],
      ["101", "2"],
      ["102", "3"],
      ["104", "4"],
    ]);
    expect(view.container.querySelectorAll("[data-video-id]")).toHaveLength(2);
    expect(
      view.container.querySelectorAll('[id^="location-wrapper-"]'),
    ).toHaveLength(3);
    const shop = view.container.querySelector('[data-profile-module="shop"]')!;
    const clinic = view.container.querySelector("#clinic")!;
    expect(
      shop.compareDocumentPosition(clinic) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("uses the exact treatment heading once for treatment-only inventory", () => {
    renderInventory([inventory("t-1", 1, "treatment")] as never);
    expect(
      screen.getAllByRole("heading", { name: treatmentTitle }),
    ).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: serviceTitle })).toBeNull();
  });

  test("uses the exact service heading once for service-only inventory", () => {
    renderInventory([inventory("s-1", 1, "service")] as never);
    expect(screen.getAllByRole("heading", { name: serviceTitle })).toHaveLength(
      1,
    );
    expect(screen.queryByRole("heading", { name: treatmentTitle })).toBeNull();
  });

  test("partitions a mixed visible group under one exact heading per kind", () => {
    renderInventory([
      inventory("t-1", 1, "treatment"),
      inventory("s-1", 2, "service"),
      inventory("t-2", 3, "treatment"),
    ] as never);
    expect(
      screen.getAllByRole("heading", { name: treatmentTitle }),
    ).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: serviceTitle })).toHaveLength(
      1,
    );
    expect(
      screen.queryByRole("heading", {
        name: `${treatmentTitle} / ${serviceTitle}`,
      }),
    ).toBeNull();
  });

  test("does not label an empty action-only clinic with an inventory title", () => {
    const view = renderInventory([]);
    expect(screen.queryByRole("heading", { name: treatmentTitle })).toBeNull();
    expect(screen.queryByRole("heading", { name: serviceTitle })).toBeNull();
    expect(view.container.querySelector("#treatments")).toBeNull();
    expect(view.container.querySelector("#services")).toBeNull();
    expect(view.container.querySelector("#clinic")).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: /Book the clinic/ }).length,
    ).toBeGreaterThan(0);
  });
});
