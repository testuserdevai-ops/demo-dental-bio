import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";

import ProfileSetupWidget from "./ProfileSetupWidget";

describe("ProfileSetupWidget", () => {
  it("shows the selected template and resumes the first unfinished step", () => {
    render(
      <ProfileSetupWidget
        completedStepIds={["profile-details", "social-links"]}
        hasAppearanceDraft
        templateId="direct-booking"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Direct Booking" }),
    ).toBeTruthy();
    expect(
      screen.getByText("2 of 5 setup steps completed.", { exact: false }),
    ).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "40",
    );
    expect(
      screen.getByRole("link", { name: /Continue setup/ }).getAttribute("href"),
    ).toBe("/onboarding/questions?template=direct-booking&step=treatments");
    expect(
      screen
        .getByRole("link", { name: /Change template/ })
        .getAttribute("href"),
    ).toBe("/onboarding/appearance?step=template");
  });

  it("returns owners without an appearance draft to the start and exposes completion", () => {
    const { rerender } = render(
      <ProfileSetupWidget
        completedStepIds={[]}
        hasAppearanceDraft={false}
        templateId="basic"
      />,
    );
    expect(
      screen.getByRole("link", { name: /Continue setup/ }).getAttribute("href"),
    ).toBe("/onboarding/appearance?step=theme");

    rerender(
      <ProfileSetupWidget
        completedStepIds={[
          "profile-details",
          "social-links",
          "links",
          "treatments",
          "videos",
          "gallery",
          "locations",
        ]}
        hasAppearanceDraft
        templateId="basic"
      />,
    );
    expect(screen.getByText("Setup complete")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Review setup/ }).getAttribute("href"),
    ).toBe("/onboarding/questions?template=basic&step=review");
  });
});
