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
    expect(
      screen
        .getByRole("radio", { name: /Premium Contrast/ })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByText("Pro · Locked")).toBeTruthy();
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
      }),
    );
    expect(navigationSpies.push).toHaveBeenCalledWith(
      "/onboarding/appearance?step=template",
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
