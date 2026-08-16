import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";

import { OnboardingActionBar } from "./OnboardingActionBar";

describe("OnboardingActionBar", () => {
  it("keeps actions visible on mobile with safe-area clearance and returns inline on desktop", () => {
    const { container } = render(
      <OnboardingActionBar className="test-surface">
        <button type="button">Back</button>
        <button type="button">Continue</button>
      </OnboardingActionBar>,
    );
    const surface = container.querySelector("[data-onboarding-action-bar]");

    expect(surface).not.toBeNull();
    expect(surface?.className).toContain("fixed");
    expect(surface?.className).toContain("bottom-0");
    expect(surface?.className).toContain("env(safe-area-inset-bottom)");
    expect(surface?.className).toContain("md:static");
    expect(surface?.className).toContain("test-surface");
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
  });

  it("can stack full-width actions in a narrow desktop sidebar", () => {
    const { container } = render(
      <OnboardingActionBar desktopLayout="stacked">
        <button type="button">Back</button>
        <button type="button">Continue</button>
      </OnboardingActionBar>,
    );

    expect(
      container.querySelector("[data-onboarding-action-bar] > div")?.className,
    ).toContain("lg:flex-col-reverse");
  });
});
