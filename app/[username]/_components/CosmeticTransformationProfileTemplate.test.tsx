import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import type { PublicProfileViewModel } from "../_lib/public-profile";

mock.module("@/app/contexts/AnalyticsContext", () => ({
  useTrackedAction: () => () => true,
  useLegacyCounterAllowed: () => false,
}));

mock.module("@/app/components/Image/SafeImage", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

mock.module("../components/Links", () => ({
  default: () => <section id="links">Planning links</section>,
}));

mock.module("./DirectBookingSocialLinks", () => ({
  DirectBookingSocialLinks: () => (
    <a href="https://instagram.com/example">Open Instagram profile</a>
  ),
}));

mock.module("./CosmeticCaseGallery", () => ({
  default: () => <section>Results</section>,
}));

const { default: CosmeticTransformationProfileTemplate } =
  await import("./CosmeticTransformationProfileTemplate");

const baseProfile = {
  user: {
    title: "Dr",
    first_name: "Mila",
    last_name: "Rahman",
    position: "Cosmetic Dentist",
    qualification: "BDS",
    gdc_no: "284901",
  },
  dentistry: {
    about_title: "Natural-looking smile transformations, planned with care",
    about_text: "A thoughtful biography.",
    booking_link: "https://example.com/book",
    booking_link_enabled: true,
    contact_email: "hello@example.com",
    phone: "+442000000000",
    treatment_section_title: "Smile treatment options",
    service_section_title: "Consultation services",
    website: "https://example.com",
  },
  profileImageUrl: "/profile.webp",
  presentation: {
    configuration: {
      schemaVersion: 1,
      templateId: "cosmetic-transformation",
      themeId: "clinical-light",
      layoutVariant: "classic-stack",
      answers: {
        signatureTreatmentId: "00000000-0000-4000-8000-000000000001",
        consultationKind: "free",
      },
    },
  },
  treatments: [
    {
      treatment_id: "00000000-0000-4000-8000-000000000001",
      rank: 1,
      treatments: {
        title: "Composite bonding",
        description: "Subtle edge refinements.",
        isService: false,
      },
    },
  ],
  linkGroups: [],
  galleries: [],
  generalGalleries: [
    {
      id: 1,
      image_url: "/hero.webp",
      title: "Consultation studio",
    },
  ],
  reviews: [],
  externalReviewPages: [],
  locations: [],
  socials: null,
} as unknown as PublicProfileViewModel;

afterEach(cleanup);

describe("CosmeticTransformationProfileTemplate", () => {
  test("uses a card hero fallback and keeps consultation content intact on Free layout", () => {
    const view = render(
      <CosmeticTransformationProfileTemplate
        profile={baseProfile}
        username="template-cosmetic-results"
      />,
    );

    const hero = view.container.querySelector('[data-cosmetic-hero="card"]');
    expect(hero).toBeTruthy();
    expect(hero?.className).toContain("px-4");
    expect(hero?.querySelector(".-mt-12")).toBeNull();
    expect(
      screen
        .getByRole("link", { name: /Book a free consultation/ })
        .getAttribute("href"),
    ).toBe("https://example.com/book");
    expect(
      screen.getByRole("heading", { name: "Composite bonding" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Smile treatment options" }),
    ).toBeTruthy();
  });

  test("uses the saved overlap composition only for the Pro layout", () => {
    const profile = {
      ...baseProfile,
      presentation: {
        ...baseProfile.presentation,
        configuration: {
          ...baseProfile.presentation.configuration,
          layoutVariant: "hero-overlap",
        },
      },
    } as PublicProfileViewModel;

    const view = render(
      <CosmeticTransformationProfileTemplate
        profile={profile}
        username="template-cosmetic-results"
      />,
    );

    const hero = view.container.querySelector('[data-cosmetic-hero="overlap"]');
    expect(hero).toBeTruthy();
    expect(hero?.querySelector(".-mt-12")).toBeTruthy();
  });

  test("matches the Basic width and keeps owner-authored profile copy in the identity block", () => {
    const view = render(
      <CosmeticTransformationProfileTemplate
        profile={baseProfile}
        username="template-cosmetic-results"
      />,
    );

    const main = view.container.querySelector("main");
    expect(main?.className).toContain("max-w-[661px]");
    expect(view.container.querySelector("#profile")).toBeTruthy();
    expect(view.container.querySelector("#treatments")).toBeTruthy();
    expect(screen.getAllByText("A thoughtful biography.")).toHaveLength(1);
    expect(
      screen.queryByText("A thoughtful plan, built around you"),
    ).toBeNull();
  });

  test("uses the exact treatment heading once across signature and additional inventory", () => {
    render(
      <CosmeticTransformationProfileTemplate
        profile={
          {
            ...baseProfile,
            treatments: [
              ...baseProfile.treatments,
              {
                treatment_id: "00000000-0000-4000-8000-000000000002",
                rank: 2,
                treatments: {
                  title: "Teeth whitening",
                  description: "A second owner-authored option.",
                  isService: false,
                },
              },
            ],
          } as PublicProfileViewModel
        }
        username="template-cosmetic-results"
      />,
    );

    expect(
      screen.getAllByRole("heading", { name: "Smile treatment options" }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Composite bonding" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Teeth whitening" }),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Additional treatment options")).toBeNull();
  });

  test("does not render the owner treatment heading for empty inventory", () => {
    render(
      <CosmeticTransformationProfileTemplate
        profile={{ ...baseProfile, treatments: [] } as PublicProfileViewModel}
        username="template-cosmetic-results"
      />,
    );
    expect(
      screen.queryByRole("heading", { name: "Smile treatment options" }),
    ).toBeNull();
  });
});
