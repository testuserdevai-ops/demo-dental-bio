import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { navigationSpies } from "@/test/mocks/next-navigation";
import type { ActionResult } from "@/lib/forms/action-result";
import type { SaveAppearanceChoiceData } from "../actions";

mock.module("next/image", () => ({ default: () => null }));

const saveAppearanceChoice = mock(
  async (): Promise<ActionResult<SaveAppearanceChoiceData>> => ({
    ok: true as const,
    data: {
      configuration: {
        schemaVersion: 1 as const,
        templateId: "basic" as const,
        themeId: "warm-care" as const,
        layoutVariant: "classic-stack" as const,
        answers: {},
      },
      revision: 1,
      nextHref: "/onboarding/appearance?step=template",
    },
  }),
);

mock.module("../actions", () => ({ saveAppearanceChoice }));

const { AppearanceChooser } = await import("./AppearanceChooser");

const configuration = {
  schemaVersion: 1 as const,
  templateId: "basic" as const,
  themeId: "clinical-light" as const,
  layoutVariant: "classic-stack" as const,
  answers: {},
};

describe("AppearanceChooser", () => {
  beforeEach(() => {
    saveAppearanceChoice.mockReset();
    saveAppearanceChoice.mockResolvedValue({
      ok: true,
      data: {
        configuration: { ...configuration, themeId: "warm-care" },
        revision: 1,
        nextHref: "/onboarding/appearance?step=template",
      },
    });
  });

  it("presents all curated themes as one native selection and explains the lock", () => {
    render(
      <AppearanceChooser
        configuration={configuration}
        entitlementTier="free"
        revision={0}
        step="theme"
      />,
    );

    const themes = screen.getAllByRole("radio");
    expect(themes).toHaveLength(5);
    expect(
      (
        screen.getByRole("radio", {
          name: /Clinical Light/,
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    const premium = screen.getByRole("radio", { name: /Premium Contrast/ });
    expect(premium.hasAttribute("disabled")).toBe(true);
    expect(premium.getAttribute("aria-describedby")).toContain(
      "theme-premium-contrast-availability",
    );
    expect(screen.getByText("Pro · Locked")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: /Save color and choose a template/ })
        .closest("[data-onboarding-action-bar]"),
    ).toBeTruthy();
  });

  it("updates the combined preview before saving and continues with the draft revision", async () => {
    render(
      <AppearanceChooser
        configuration={configuration}
        entitlementTier="pro"
        revision={7}
        step="theme"
      />,
    );

    const entitledPremium = screen.getByRole("radio", {
      name: /Premium Contrast/,
    });
    expect(entitledPremium.hasAttribute("disabled")).toBe(false);
    expect(entitledPremium.closest("div.relative")?.textContent).toContain(
      "Pro",
    );
    expect(entitledPremium.closest("div.relative")?.textContent).not.toContain(
      "Pro · Locked",
    );
    const freeClinical = screen.getByRole("radio", {
      name: /Clinical Light/,
    });
    expect(freeClinical.closest("div.relative")?.textContent).toContain("Free");

    const initialSample = screen.getAllByTestId("semantic-theme-preview")[0];
    const initialThemeRoot = initialSample.closest<HTMLElement>(
      '[data-profile-theme="clinical-light"]',
    );
    expect(initialThemeRoot?.style.getPropertyValue("--primary")).toBe(
      "#5046db",
    );

    fireEvent.click(screen.getByRole("radio", { name: /Warm Care/ }));
    expect(screen.getAllByText("Warm Care + Basic").length).toBeGreaterThan(0);
    const warmSample = screen.getAllByTestId("semantic-theme-preview")[0];
    const warmThemeRoot = warmSample.closest<HTMLElement>(
      '[data-profile-theme="warm-care"]',
    );
    expect(warmThemeRoot?.style.getPropertyValue("--primary")).toBe("#8a3f2d");
    expect(screen.getAllByText("Theme response").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Template reference").length).toBeGreaterThan(0);
    expect(screen.queryByText("Live combination")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Save color and choose a template/,
      }),
    );

    await waitFor(() =>
      expect(saveAppearanceChoice).toHaveBeenCalledWith({
        step: "theme",
        expectedRevision: 7,
        themeId: "warm-care",
        templateId: "basic",
        confirmTemplateAnswerReset: false,
      }),
    );
    expect(navigationSpies.push).toHaveBeenCalledWith(
      "/onboarding/appearance?step=template",
    );
  });

  it("summarizes and confirms the impact before clearing template answers", async () => {
    const answeredConfiguration = {
      schemaVersion: 1 as const,
      templateId: "direct-booking" as const,
      themeId: "warm-care" as const,
      layoutVariant: "classic-stack" as const,
      answers: { primaryAction: "booking" as const },
    };
    render(
      <AppearanceChooser
        configuration={answeredConfiguration}
        entitlementTier="pro"
        revision={8}
        step="template"
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "Confirm this template change" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Services Catalogue/ }));

    expect(
      screen.getByRole("heading", { name: "Confirm this template change" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/saved setup answers for Direct Booking/),
    ).toBeTruthy();
    expect(
      screen.getByText(/links, videos, treatments, locations/),
    ).toBeTruthy();
    const confirmation = screen.getByRole("checkbox", {
      name: /clear the previous template setup answers/,
    });
    const continueButton = screen.getByRole("button", {
      name: /Save template and continue to questions/,
    });
    expect(continueButton.closest("[data-onboarding-action-bar]")).toBeTruthy();
    expect(continueButton.hasAttribute("disabled")).toBe(true);

    fireEvent.click(confirmation);
    expect(continueButton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(continueButton);

    await waitFor(() =>
      expect(saveAppearanceChoice).toHaveBeenCalledWith({
        step: "template",
        expectedRevision: 8,
        themeId: "warm-care",
        templateId: "services-catalogue",
        confirmTemplateAnswerReset: true,
      }),
    );
  });

  it("shows nine template purposes and keeps selection when save fails", async () => {
    saveAppearanceChoice.mockResolvedValueOnce({
      ok: false,
      code: "SAVE_FAILED",
      formError:
        "We could not save your choices. Your selection is still here, so you can try again.",
    });
    render(
      <AppearanceChooser
        configuration={configuration}
        entitlementTier="free"
        revision={1}
        step="template"
      />,
    );

    expect(screen.getAllByRole("radio")).toHaveLength(9);
    const services = screen.getByRole("radio", {
      name: /Services Catalogue/,
    });
    services.focus();
    fireEvent.click(services);
    expect(document.activeElement).toBe(services);
    expect(
      screen.getAllByText("Clinical Light + Services Catalogue").length,
    ).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Save template and continue to questions/,
      }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Your selection is still here",
    );
    expect((services as HTMLInputElement).checked).toBe(true);
  });

  it("previews an unselected template without changing it until explicitly used", () => {
    render(
      <AppearanceChooser
        configuration={configuration}
        entitlementTier="pro"
        revision={1}
        step="template"
      />,
    );

    const basic = screen.getByRole("radio", { name: /^Basic/ });
    const directBooking = screen.getByRole("radio", {
      name: /^Direct Booking/,
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Preview Direct Booking" }),
    );

    expect(screen.getByRole("dialog").textContent).toContain(
      "Preview template: Direct Booking",
    );
    expect((basic as HTMLInputElement).checked).toBe(true);
    expect((directBooking as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Use this template" }));
    expect((directBooking as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("previews and uses a color independently from the theme radio", () => {
    render(
      <AppearanceChooser
        configuration={configuration}
        entitlementTier="pro"
        revision={1}
        step="theme"
      />,
    );

    const clinical = screen.getByRole("radio", { name: /Clinical Light/ });
    const warm = screen.getByRole("radio", { name: /Warm Care/ });
    fireEvent.click(screen.getByRole("button", { name: "Preview Warm Care" }));

    expect(screen.getByRole("dialog").textContent).toContain(
      "Preview color: Warm Care",
    );
    expect((clinical as HTMLInputElement).checked).toBe(true);
    expect((warm as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Use this color" }));
    expect((warm as HTMLInputElement).checked).toBe(true);
  });

  it("shows an honest locked preview without an enabled use action", () => {
    render(
      <AppearanceChooser
        configuration={configuration}
        entitlementTier="free"
        revision={1}
        step="theme"
      />,
    );

    const premium = screen.getByRole("radio", {
      name: /Premium Contrast/,
    }) as HTMLInputElement;
    fireEvent.click(
      screen.getByRole("button", { name: "Preview Premium Contrast" }),
    );
    const lockedAction = screen.getByRole("button", { name: "Pro · Locked" });
    expect(lockedAction.hasAttribute("disabled")).toBe(true);
    expect(premium.checked).toBe(false);
  });

  it("offers a stale-draft reload action on a revision conflict", async () => {
    saveAppearanceChoice.mockResolvedValueOnce({
      ok: false,
      code: "CONFLICT",
      formError:
        "These choices changed in another tab. Reload the saved choices before continuing.",
    });
    render(
      <AppearanceChooser
        configuration={configuration}
        entitlementTier="free"
        revision={3}
        step="theme"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Save color and choose a template/,
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Reload/ }));
    expect(navigationSpies.refresh).toHaveBeenCalledTimes(1);
  });

  it("announces an entitlement fallback without claiming it was published", () => {
    render(
      <AppearanceChooser
        configuration={configuration}
        entitlementTier="free"
        revision={4}
        step="theme"
        fallbackNotice="Premium Contrast requires Pro, so Clinical Light is selected for now. Your saved intent has not been published or deleted."
      />,
    );

    expect(screen.getByRole("status").textContent).toContain(
      "has not been published or deleted",
    );
  });
});
