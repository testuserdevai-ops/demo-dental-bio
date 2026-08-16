import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { navigationSpies } from "@/test/mocks/next-navigation";
import type { ActionResult } from "@/lib/forms/action-result";
import type { SaveAppearanceChoiceData } from "../actions";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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
const pushState = mock(() => {});

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
    pushState.mockClear();
    window.history.pushState = pushState;
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
          name: /Violet/,
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    const premium = screen.getByRole("radio", { name: /Premium Contrast/ });
    expect(premium.hasAttribute("disabled")).toBe(true);
    expect(premium.getAttribute("aria-describedby")).toContain(
      "theme-premium-contrast-availability",
    );
    expect(screen.getByText("Pro · Locked")).toBeTruthy();
    expect(screen.queryByText("Free", { exact: true })).toBeNull();
    expect(screen.queryByRole("button", { name: /Preview Violet/ })).toBeNull();
    expect(screen.queryByText(/Start with a curated palette/)).toBeNull();
    expect(
      screen
        .getByRole("button", { name: /Continue with Violet/ })
        .closest("[data-onboarding-action-bar]"),
    ).toBeTruthy();
  });

  it("updates the combined preview before saving and continues with the draft revision", async () => {
    const { container } = render(
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
    expect(
      entitledPremium.closest("[data-theme-choice-card]")?.textContent,
    ).toContain("Pro");
    expect(
      entitledPremium.closest("[data-theme-choice-card]")?.textContent,
    ).not.toContain("Pro · Locked");
    const freeViolet = screen.getByRole("radio", {
      name: /Violet/,
    });
    expect(
      freeViolet.closest("[data-theme-choice-card]")?.textContent,
    ).not.toContain("Free");

    const initialSample = screen.getAllByTestId("semantic-theme-preview")[0];
    expect(
      container.firstElementChild?.hasAttribute("data-profile-theme"),
    ).toBe(false);
    expect(
      Array.from(container.querySelectorAll("[data-profile-theme]")).every(
        (node) => node.hasAttribute("data-preview-theme-scope"),
      ),
    ).toBe(true);
    const initialThemeRoot = initialSample.closest<HTMLElement>(
      '[data-profile-theme="clinical-light"]',
    );
    expect(initialThemeRoot?.style.getPropertyValue("--primary")).toBe(
      "#5046db",
    );

    fireEvent.click(screen.getByRole("radio", { name: /Terracotta/ }));
    expect(
      screen.getByText(
        "Terracotta uses warm porcelain with terracotta actions and a teal focus.",
      ),
    ).toBeTruthy();
    const warmSample = screen.getAllByTestId("semantic-theme-preview")[0];
    const warmThemeRoot = warmSample.closest<HTMLElement>(
      '[data-profile-theme="warm-care"]',
    );
    expect(warmThemeRoot?.style.getPropertyValue("--primary")).toBe("#8a3f2d");
    expect(screen.queryByText("Theme response")).toBeNull();
    expect(screen.queryByText("Template reference")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Continue with Terracotta/,
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
    expect(pushState).toHaveBeenCalledWith(
      null,
      "",
      "/onboarding/appearance?step=template",
    );
    expect(navigationSpies.push).not.toHaveBeenCalled();
  });

  it("shows template choices immediately while the color save is pending", async () => {
    const request = deferred<ActionResult<SaveAppearanceChoiceData>>();
    saveAppearanceChoice.mockImplementationOnce(() => request.promise);
    render(
      <AppearanceChooser
        configuration={configuration}
        entitlementTier="pro"
        revision={7}
        step="theme"
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Terracotta/ }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /Continue with Terracotta/,
      }),
    );

    expect(
      screen.getByRole("heading", { name: /Choose your profile template/ }),
    ).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(9);
    expect(
      screen
        .getByRole("button", {
          name: /Save template and continue to questions/,
        })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(navigationSpies.push).not.toHaveBeenCalled();

    await act(async () => {
      request.resolve({
        ok: true,
        data: {
          configuration: { ...configuration, themeId: "warm-care" },
          revision: 8,
          nextHref: "/onboarding/appearance?step=template",
        },
      });
      await request.promise;
    });
    expect(screen.queryByText("Saving your color choice")).toBeNull();
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
      screen.getAllByText("Violet + Services Catalogue").length,
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

  it("uses the owner's name, initials, and specialty in the live preview", () => {
    render(
      <AppearanceChooser
        configuration={configuration}
        entitlementTier="free"
        profile={{
          initials: "JS",
          displayName: "Dr Jordan Smith",
          specialty: "Orthodontist",
          usesFallback: false,
        }}
        revision={1}
        step="theme"
      />,
    );

    expect(
      screen.getAllByRole("img", {
        name: /Violet profile preview for Dr Jordan Smith/,
      }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("JS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dr Jordan Smith").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Orthodontist").length).toBeGreaterThan(0);
  });

  it("keeps a locked premium color unavailable without adding a preview action", () => {
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
    expect(premium.disabled).toBe(true);
    expect(premium.checked).toBe(false);
    expect(
      screen.queryByRole("button", { name: /Preview Premium Contrast/ }),
    ).toBeNull();
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
        name: /Continue with Violet/,
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
        fallbackNotice="Premium Contrast requires Pro, so Violet is selected for now. Your saved intent has not been published or deleted."
      />,
    );

    expect(screen.getByRole("status").textContent).toContain(
      "has not been published or deleted",
    );
  });
});
