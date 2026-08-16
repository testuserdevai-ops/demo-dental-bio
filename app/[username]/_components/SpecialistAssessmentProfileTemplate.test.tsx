import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import type { PublicProfileViewModel } from "../_lib/public-profile";

mock.module("@/app/components/Image/SafeImage", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

mock.module("@/app/components/analytics/TrackedAction", () => ({
  TrackedLink: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

mock.module("../components/LocationMapModal", () => ({
  default: () => <button type="button">View map</button>,
}));

mock.module("./DirectBookingSocialLinks", () => ({
  DirectBookingSocialLinks: () => (
    <a href="https://instagram.com/example">Open Instagram profile</a>
  ),
}));

const { default: SpecialistAssessmentProfileTemplate } =
  await import("./SpecialistAssessmentProfileTemplate");

afterEach(cleanup);

const profile = {
  user: {
    title: "Dr",
    first_name: "Amara",
    last_name: "Shah",
    position: "Endodontist",
    qualification: "MEndo",
  },
  dentistry: {
    about_title: "Understand your tooth pain",
    about_text: "Tell us what has been happening and we will review it.",
    booking_link: "https://example.com/book",
    booking_link_enabled: true,
    contact_email: "hello@example.com",
    phone: "+442071234567",
    treatment_section_title: "Endodontic treatment options",
    service_section_title: "Assessment services",
    website: "https://example.com",
  },
  profileImageUrl: "/profile.webp",
  presentation: {
    configuration: {
      schemaVersion: 1,
      templateId: "specialist-assessment",
      themeId: "modern-specialist",
      layoutVariant: "section-navigator",
      answers: {
        primaryPath: "assessment",
        referralRequired: true,
        showEmergencyFirst: false,
      },
    },
  },
  treatments: [
    {
      treatment_id: "treatment-1",
      rank: 1,
      treatments: {
        title: "Root canal assessment",
        description: "Owner-authored treatment copy.",
        isService: false,
      },
    },
  ],
  linkGroups: [
    {
      link_group_id: "group-1",
      heading: "Assessment",
      rank: 1,
      dentistry_links: [
        {
          links: {
            link_id: "link-1",
            title: "Start online assessment",
            link: "https://example.com/assessment",
            is_active: true,
            rank: 1,
            image_url: null,
            image_alt: null,
          },
        },
      ],
    },
  ],
  reviews: [],
  locations: [],
  socials: null,
} as unknown as PublicProfileViewModel;

describe("SpecialistAssessmentProfileTemplate", () => {
  test("keeps the focused action journey compact and owner-authored", () => {
    const view = render(
      <SpecialistAssessmentProfileTemplate
        profile={profile}
        username="template-specialist-assessment"
      />,
    );

    expect(view.container.querySelector("main")?.className).toContain(
      "max-w-[661px]",
    );
    expect(
      screen.getByRole("heading", { name: "Understand your tooth pain" }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: /Start your assessment/ }),
    ).toHaveLength(2);
    expect(screen.getByText("Referral required")).toBeTruthy();
    expect(screen.queryByText("A clear route to specialist advice")).toBeNull();
    expect(screen.queryByText("Send useful records")).toBeNull();
    expect(screen.queryByText("Owner-authored treatment copy.")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Endodontic treatment options" }),
    ).toBeTruthy();
    expect(view.container.querySelector("#profile")).toBeTruthy();
    expect(view.container.querySelector("#treatments")).toBeTruthy();
  });

  test("uses the exact owner heading once and omits it for empty inventory", () => {
    const view = render(
      <SpecialistAssessmentProfileTemplate
        profile={profile}
        username="template-specialist-assessment"
      />,
    );
    expect(
      screen.getAllByRole("heading", {
        name: "Endodontic treatment options",
      }),
    ).toHaveLength(1);
    view.unmount();

    render(
      <SpecialistAssessmentProfileTemplate
        profile={{ ...profile, treatments: [] } as PublicProfileViewModel}
        username="template-specialist-assessment"
      />,
    );
    expect(
      screen.queryByRole("heading", {
        name: "Endodontic treatment options",
      }),
    ).toBeNull();
  });
});
