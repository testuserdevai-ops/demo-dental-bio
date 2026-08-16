import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";

import DashboardOnboardingProgressCard, {
  resolveDashboardOnboardingProgress,
} from "./DashboardOnboardingProgressCard";

describe("DashboardOnboardingProgressCard", () => {
  it("shows percentage, remaining work, and the first incomplete step", () => {
    render(
      <DashboardOnboardingProgressCard
        progress={{
          completedStepIds: ["profile-details", "social-links"],
          hasAppearanceDraft: true,
          templateId: "direct-booking",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "50% complete" })).toBeTruthy();
    expect(screen.getByText(/3 steps remaining/)).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "50",
    );
    expect(
      screen
        .getByRole("link", { name: /Continue profile setup/ })
        .getAttribute("href"),
    ).toBe("/onboarding/questions?template=direct-booking&step=treatments");
    expect(
      screen
        .getByRole("link", { name: /Update template or colors/ })
        .getAttribute("href"),
    ).toBe("/onboarding/appearance?step=theme");
  });

  it("starts missing appearances at colors and reports all template steps", () => {
    const state = resolveDashboardOnboardingProgress({
      completedStepIds: [],
      hasAppearanceDraft: false,
      templateId: "basic",
    });

    expect(state.percentage).toBe(0);
    expect(state.remainingCount).toBe(8);
    expect(state.continueHref).toBe("/onboarding/appearance?step=theme");
  });
});
