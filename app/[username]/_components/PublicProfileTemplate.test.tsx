import { describe, expect, mock, test } from "bun:test";
import { render, screen } from "@testing-library/react";

import type { PublicProfileViewModel } from "../_lib/public-profile";

mock.module("./PublicProfileHeader", () => ({
  default: ({
    templateId,
    username,
  }: {
    templateId: string;
    username: string;
  }) => (
    <header data-testid="public-profile-header" data-template={templateId}>
      @{username}
    </header>
  ),
}));

mock.module("../components/Footer", () => ({
  default: ({ username }: { username: string }) => (
    <footer data-testid="public-profile-footer">@{username}</footer>
  ),
}));

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

mock.module("./TrustFirstFamilyProfileTemplate", () => ({
  default: ({ username }: { username: string }) => (
    <div data-testid="trust-first-renderer">{username}</div>
  ),
}));

mock.module("./CosmeticTransformationProfileTemplate", () => ({
  default: ({ username }: { username: string }) => (
    <div data-testid="cosmetic-transformation-renderer">{username}</div>
  ),
}));

mock.module("./ServicesCatalogueProfileTemplate", () => ({
  default: ({ username }: { username: string }) => (
    <div data-testid="services-catalogue-renderer">{username}</div>
  ),
}));

mock.module("./SpecialistAssessmentProfileTemplate", () => ({
  default: ({ username }: { username: string }) => (
    <div data-testid="specialist-assessment-renderer">{username}</div>
  ),
}));

mock.module("./ClinicCommerceProfileTemplate", () => ({
  default: ({ username }: { username: string }) => (
    <div data-testid="clinic-commerce-renderer">{username}</div>
  ),
}));

mock.module("./ExpertEducatorProfileTemplate", () => ({
  default: ({ username }: { username: string }) => (
    <div data-testid="expert-educator-renderer">{username}</div>
  ),
}));

const { default: PublicProfileTemplate } =
  await import("./PublicProfileTemplate");

describe("PublicProfileTemplate", () => {
  test("routes Clinic and Commerce through its distinct renderer", () => {
    const profile = {
      presentation: {
        configuration: {
          schemaVersion: 1,
          templateId: "clinic-commerce",
          themeId: "editorial-expert",
          layoutVariant: "classic-stack",
          answers: { defaultAudience: "shop", featuredProductId: "21" },
        },
      },
    } as PublicProfileViewModel;

    render(
      <PublicProfileTemplate
        username="template-clinic-commerce"
        profile={profile}
      />,
    );

    expect(screen.getByTestId("clinic-commerce-renderer").textContent).toBe(
      "template-clinic-commerce",
    );
    expect(screen.queryByTestId("basic-renderer")).toBeNull();
    expect(document.querySelectorAll("[data-profile-theme]")).toHaveLength(1);
    expect(screen.getAllByTestId("public-profile-header")).toHaveLength(1);
    expect(screen.getAllByTestId("public-profile-footer")).toHaveLength(1);
    expect(
      screen.getByTestId("public-profile-header").getAttribute("data-template"),
    ).toBe("clinic-commerce");
  });

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
    expect(screen.getAllByTestId("public-profile-header")).toHaveLength(1);
    expect(screen.getAllByTestId("public-profile-footer")).toHaveLength(1);
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

  test("dispatches Services Catalogue inside the selected theme boundary", () => {
    const profile = {
      presentation: {
        configuration: {
          schemaVersion: 1,
          templateId: "services-catalogue",
          themeId: "warm-care",
          layoutVariant: "section-navigator",
          answers: {
            featuredTreatmentIds: ["10000000-0000-4000-8000-000000000001"],
            showFinancingBeforeTeam: true,
          },
        },
      },
    } as PublicProfileViewModel;

    render(
      <PublicProfileTemplate
        username="template-services-catalogue"
        profile={profile}
      />,
    );

    expect(screen.getByTestId("services-catalogue-renderer").textContent).toBe(
      "template-services-catalogue",
    );
    expect(screen.queryByTestId("basic-renderer")).toBeNull();
    expect(
      document
        .querySelector("[data-profile-theme]")
        ?.getAttribute("data-profile-theme"),
    ).toBe("warm-care");
  });

  test("routes Trust-First through its warm-care presentation boundary", () => {
    const profile = {
      presentation: {
        configuration: {
          schemaVersion: 1,
          templateId: "trust-first-family-practice",
          themeId: "warm-care",
          layoutVariant: "classic-stack",
          answers: {
            featuredReviewIds: ["21"],
            priorityInformation: ["anxiety-care"],
          },
        },
      },
    } as PublicProfileViewModel;

    render(
      <PublicProfileTemplate
        username="template-trust-first"
        profile={profile}
      />,
    );

    expect(screen.getByTestId("trust-first-renderer").textContent).toBe(
      "template-trust-first",
    );
    expect(screen.queryByTestId("basic-renderer")).toBeNull();
    expect(
      document
        .querySelector("[data-profile-theme]")
        ?.getAttribute("data-profile-theme"),
    ).toBe("warm-care");
  });

  test("routes Cosmetic Transformation through its distinct renderer", () => {
    const profile = {
      presentation: {
        configuration: {
          schemaVersion: 1,
          templateId: "cosmetic-transformation",
          themeId: "premium-contrast",
          layoutVariant: "classic-stack",
          answers: {
            consultationKind: "free",
            signatureTreatmentId: "11111111-1111-4111-8111-111111111111",
          },
        },
      },
    } as PublicProfileViewModel;

    render(
      <PublicProfileTemplate
        username="template-cosmetic-results"
        profile={profile}
      />,
    );

    expect(
      screen.getByTestId("cosmetic-transformation-renderer").textContent,
    ).toBe("template-cosmetic-results");
    expect(screen.queryByTestId("basic-renderer")).toBeNull();
    expect(document.querySelectorAll("[data-profile-theme]")).toHaveLength(1);
  });

  test("routes Specialist Assessment through its distinct renderer", () => {
    const profile = {
      presentation: {
        configuration: {
          schemaVersion: 1,
          templateId: "specialist-assessment",
          themeId: "modern-specialist",
          layoutVariant: "classic-stack",
          answers: {
            primaryPath: "assessment",
            referralRequired: true,
          },
        },
      },
    } as PublicProfileViewModel;

    render(
      <PublicProfileTemplate
        username="template-specialist-assessment"
        profile={profile}
      />,
    );

    expect(
      screen.getByTestId("specialist-assessment-renderer").textContent,
    ).toBe("template-specialist-assessment");
    expect(screen.queryByTestId("basic-renderer")).toBeNull();
    expect(document.querySelectorAll("[data-profile-theme]")).toHaveLength(1);
  });
  test("routes Expert and Educator through its editorial theme boundary", () => {
    const profile = {
      presentation: {
        configuration: {
          schemaVersion: 1,
          templateId: "expert-educator",
          themeId: "editorial-expert",
          layoutVariant: "editorial-split",
          answers: { defaultAudience: "professionals" },
        },
      },
    } as PublicProfileViewModel;

    render(
      <PublicProfileTemplate
        username="template-expert-educator"
        profile={profile}
      />,
    );

    expect(screen.getByTestId("expert-educator-renderer").textContent).toBe(
      "template-expert-educator",
    );
    expect(screen.queryByTestId("basic-renderer")).toBeNull();
    expect(
      document
        .querySelector("[data-profile-theme]")
        ?.getAttribute("data-profile-theme"),
    ).toBe("editorial-expert");
  });
});
