import React from "react";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import { NavbarProvider } from "@/app/contexts/NavbarContext";
import type { PublicProfileViewModel } from "../_lib/public-profile";

mock.module("@/app/components/Image/SafeImage", () => ({
  default: ({ alt }: { alt: string }) => <span aria-label={alt} role="img" />,
  safeMediaSrc: (source: string | null | undefined) =>
    source?.trim() ? source : undefined,
}));

const { default: ServicesCatalogueProfileTemplate } =
  await import("./ServicesCatalogueProfileTemplate");

const treatmentTitle = "Owner treatment heading";
const serviceTitle = "Owner service heading";

function inventory(id: string, rank: number, kind: "treatment" | "service") {
  return {
    treatment_id: id,
    rank,
    treatments: {
      title: `${kind} ${rank}`,
      description: rank === 4 ? "Expandable remainder" : null,
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
      about_title: "Clear choices",
      about_text: "Owner-authored introduction.",
      booking_link_enabled: false,
      treatment_section_title: treatmentTitle,
      service_section_title: serviceTitle,
    },
    profileImageUrl: "http://localhost:3000/profile.webp",
    presentation: {
      configuration: {
        schemaVersion: 1,
        templateId: "services-catalogue",
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
  return renderProfile(profileWith(treatments));
}

function renderProfile(profile: PublicProfileViewModel) {
  return render(
    <AnalyticsProvider
      profileId="00000000-0000-4000-8000-000000000001"
      renderContext={{ kind: "excluded", reason: "unverified_preview" }}
    >
      <NavbarProvider>
        <ServicesCatalogueProfileTemplate
          profile={profile}
          username="catalogue-owner"
        />
      </NavbarProvider>
    </AnalyticsProvider>,
  );
}

afterEach(cleanup);

describe("ServicesCatalogueProfileTemplate inventory headings", () => {
  test("renders the complete review inventory without the old three-card cap", () => {
    const profile = profileWith([]);
    profile.reviews = Array.from({ length: 4 }, (_, index) => ({
      id: 301 + index,
      reviewer_name: `Catalogue reviewer ${index + 1}`,
      content: `Catalogue review ${index + 1}`,
      stars: 5,
      image_url: null,
      platform: "Google",
      created_at: `2026-01-0${index + 1}T09:00:00.000Z`,
      rank: index + 1,
      enabled: true,
    })) as never;
    profile.externalReviewPages = [
      { id: 401, link: "https://reviews.example/catalogue" },
    ] as never;
    const { container } = renderProfile(profile);
    expect(
      Array.from(container.querySelectorAll("[data-review-id]")).map((node) =>
        node.getAttribute("data-review-id"),
      ),
    ).toEqual(["301", "302", "303", "304"]);
    expect(
      container
        .querySelector('[data-external-review-page-id="401"]')
        ?.getAttribute("href"),
    ).toBe("https://reviews.example/catalogue");
    expect(screen.queryByText("Patient reviews", { exact: true })).toBeNull();
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

  test("partitions mixed featured and remainder cards under one exact heading per kind", () => {
    renderInventory([
      inventory("t-1", 1, "treatment"),
      inventory("s-1", 2, "service"),
      inventory("t-2", 3, "treatment"),
      inventory("t-3", 4, "treatment"),
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
    expect(screen.getByText("treatment 4")).toBeTruthy();
  });

  test("renders neither owner inventory heading for empty inventory", () => {
    const view = renderInventory([]);
    expect(screen.queryByRole("heading", { name: treatmentTitle })).toBeNull();
    expect(screen.queryByRole("heading", { name: serviceTitle })).toBeNull();
    expect(view.container.querySelector("#treatments")).toBeNull();
    expect(view.container.querySelector("#services")).toBeNull();
  });
});
