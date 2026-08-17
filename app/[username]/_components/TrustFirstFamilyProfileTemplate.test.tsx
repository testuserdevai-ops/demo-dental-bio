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

const { default: TrustFirstFamilyProfileTemplate } =
  await import("./TrustFirstFamilyProfileTemplate");

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
      image_url: null,
      platform: "Google",
      created_at: "2026-01-01T09:00:00.000Z",
      rank: 1,
      enabled: true,
    },
    {
      id: 22,
      reviewer_name: "Parent B",
      content: "Second review",
      stars: 5,
      image_url: null,
      platform: "Google",
      created_at: "2026-01-02T09:00:00.000Z",
      rank: 2,
      enabled: true,
    },
    {
      id: 23,
      reviewer_name: "Parent C",
      content: "Third review",
      stars: 4,
      image_url: null,
      platform: "Doctify",
      created_at: "2026-01-03T09:00:00.000Z",
      rank: 3,
      enabled: true,
    },
    {
      id: 24,
      reviewer_name: "Parent D",
      content: "Fourth review",
      stars: 5,
      image_url: null,
      platform: "Google",
      created_at: "2026-01-04T09:00:00.000Z",
      rank: 4,
      enabled: true,
    },
  ],
  externalReviewPages: [
    { id: 25, link: "https://reviews.example/trust-first" },
  ],
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

function renderTemplate(templateProfile = profile) {
  return render(
    <AnalyticsProvider
      profileId={templateProfile.user.id}
      renderContext={{ kind: "public" }}
    >
      <TrustFirstFamilyProfileTemplate
        profile={templateProfile}
        username="template-trust-first"
      />
    </AnalyticsProvider>,
  );
}

describe("TrustFirstFamilyProfileTemplate", () => {
  test("keeps practical booking content around every video, product, and location", () => {
    const nextWaveProfile = {
      ...profile,
      products: [1, 2, 3, 4].map((id) => ({
        id: String(700 + id),
        name: `Family product ${id}`,
        link: `https://example.com/family-${id}`,
        rank: id < 3 ? 1 : 2,
        enabled: true,
      })),
      videoGroups: [
        {
          id: "801",
          name: "Family videos",
          rank: 1,
          enabled: true,
          datas: [1, 2, 3, 4].map((id) => ({
            id: String(900 + id),
            title: `Family video ${id}`,
            link: `https://media.example.com/family-${id}.mp4`,
            rank: id < 3 ? 1 : 2,
            enabled: true,
          })),
        },
      ],
      locations: [3, 1, 2].map((id) => ({
        location_id: `10000000-0000-4000-8000-00000000090${id}`,
        locations: {
          business_name: `Family location ${id}`,
          full_address: `${id} Family Street`,
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
    const view = renderTemplate(nextWaveProfile);

    expect(view.container.querySelectorAll("[data-video-id]")).toHaveLength(4);
    expect(view.container.querySelectorAll("[data-product-id]")).toHaveLength(
      4,
    );
    expect(
      view.container.querySelectorAll('[id^="location-wrapper-"]'),
    ).toHaveLength(3);
    expect(
      screen.getByRole("heading", { name: "Practical information" }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: /Book a family appointment/ }),
    ).toHaveLength(2);
  });

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
    const reviews = document.querySelector(
      '[data-profile-module="trust-first-family-practice-reviews"]',
    );

    expect(root).not.toBeNull();
    expect(
      heading.compareDocumentPosition(firstBooking) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      firstBooking.compareDocumentPosition(reviews!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: /Book a family appointment/ }),
    ).toHaveLength(2);
  });

  test("renders the full ranked inventory despite legacy featured review IDs", () => {
    renderTemplate();

    const reviewCards = Array.from(
      document.querySelectorAll("[data-review-id]"),
    );
    expect(
      reviewCards.map((card) => card.getAttribute("data-review-id")),
    ).toEqual(["21", "22", "23", "24"]);
    expect(
      reviewCards.map((card) => card.getAttribute("data-review-position")),
    ).toEqual(["1", "2", "3", "4"]);
    expect(
      document
        .querySelector('[data-external-review-page-id="25"]')
        ?.getAttribute("href"),
    ).toBe("https://reviews.example/trust-first");
    expect(screen.queryByText("Families feel listened to")).toBeNull();
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

  test("uses the exact owner heading once and omits it for empty inventory", () => {
    renderTemplate();
    expect(
      screen.getAllByRole("heading", { name: "Care for growing smiles" }),
    ).toHaveLength(1);
    cleanup();

    renderTemplate({ ...profile, treatments: [] } as PublicProfileViewModel);
    expect(
      screen.queryByRole("heading", { name: "Care for growing smiles" }),
    ).toBeNull();
  });
});
