import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type { PublicProfileViewModel } from "../_lib/public-profile";
import TrustFirstFamilyProfileTemplate from "./TrustFirstFamilyProfileTemplate";

afterEach(cleanup);

const profile = {
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Dr",
    first_name: "Sara",
    last_name: "Morgan",
    position: "Family dentist",
    qualification: "BDS",
  },
  dentistry: {
    about_title: "A gentle start for every smile",
    about_text: "We listen first, explain each option, and move at your pace.",
    booking_link: "https://example.com/book",
    booking_link_enabled: true,
    phone: "+442079460123",
    contact_email: "hello@example.com",
    treatment_section_title: "Care for growing smiles",
    service_section_title: "Family support",
    website: "https://example.com",
  },
  profileImageUrl:
    "http://localhost:54321/storage/v1/object/public/profile.webp",
  presentation: {
    configuration: {
      schemaVersion: 1,
      templateId: "trust-first-family-practice",
      themeId: "warm-care",
      layoutVariant: "classic-stack",
      answers: {
        featuredReviewIds: ["22", "21"],
        priorityInformation: ["anxiety-care", "accessibility"],
      },
    },
  },
  reviews: [
    {
      id: 21,
      reviewer_name: "Parent A",
      content: "First review",
      stars: 5,
      rank: 1,
    },
    {
      id: 22,
      reviewer_name: "Parent B",
      content: "Second review",
      stars: 5,
      rank: 2,
    },
  ],
  externalReviewPages: [],
  treatments: [
    {
      treatment_id: "31",
      rank: 1,
      treatments: {
        title: "Children's check-ups",
        description: "Relaxed prevention-led visits.",
        isService: false,
      },
    },
  ],
  generalGalleries: [
    {
      id: 41,
      image_url: "http://localhost:3000/previews/hero-image-2.webp",
      title: "A calm visit",
    },
  ],
  locations: [],
  linkGroups: [],
  socials: {
    instagram_link: "https://instagram.com/example",
  },
} as unknown as PublicProfileViewModel;

function renderTemplate() {
  return render(
    <AnalyticsProvider
      profileId={profile.user.id}
      renderContext={{ kind: "public" }}
    >
      <TrustFirstFamilyProfileTemplate
        profile={profile}
        username="template-trust-first"
      />
    </AnalyticsProvider>,
  );
}

describe("TrustFirstFamilyProfileTemplate", () => {
  test("keeps reassurance and the booking task above supporting detail", () => {
    renderTemplate();

    const root = document.querySelector(
      '[data-profile-template="trust-first-family-practice"]',
    );
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "A gentle start for every smile",
    });
    const firstBooking = screen.getAllByRole("link", {
      name: /Book a family appointment/,
    })[0];
    const reviewsHeading = screen.getByRole("heading", {
      name: "Families feel listened to",
    });

    expect(root).not.toBeNull();
    expect(
      heading.compareDocumentPosition(firstBooking) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      firstBooking.compareDocumentPosition(reviewsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: /Book a family appointment/ }),
    ).toHaveLength(2);
  });

  test("renders selected proof in answer order without invented reassurance copy", () => {
    renderTemplate();

    const reviewCards = Array.from(
      document.querySelectorAll("[data-review-id]"),
    );
    expect(
      reviewCards.map((card) => card.getAttribute("data-review-id")),
    ).toEqual(["22", "21"]);
    expect(screen.queryByText("Anxiety-aware care")).toBeNull();
    expect(screen.queryByText("Accessible visits")).toBeNull();
    expect(screen.getByText("Children's check-ups")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Care for growing smiles" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Open Instagram profile" }),
    ).toBeTruthy();
  });

  test("uses a compact mobile-first container without horizontal-width hacks", () => {
    renderTemplate();

    const main = document.querySelector("main");
    expect(main?.className).toContain("w-full");
    expect(main?.className).toContain("max-w-[661px]");
    expect(main?.className).toContain("px-4");
    expect(main?.className).not.toMatch(/min-w-|w-screen/);
    expect(document.getElementById("profile")).toBeTruthy();
    expect(document.getElementById("review")).toBeTruthy();
    expect(document.getElementById("treatments")).toBeTruthy();
  });
});
