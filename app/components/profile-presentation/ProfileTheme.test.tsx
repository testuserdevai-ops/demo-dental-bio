// @ts-nocheck -- Bun provides its test module at runtime.
import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

import { ProfileThemeChoice } from "./ProfileThemeChoice";
import { ProfileThemeRoot } from "./ProfileThemeRoot";

describe("profile theme presentation primitives", () => {
  it("applies a controlled theme to a semantic variable boundary", () => {
    render(
      <ProfileThemeRoot data-testid="theme-root" themeId="warm-care">
        <p>Profile content</p>
      </ProfileThemeRoot>,
    );

    const root = screen.getByTestId("theme-root");
    expect(root.getAttribute("data-profile-theme")).toBe("warm-care");
    expect(root.style.getPropertyValue("--background")).toBe("#fbf6f1");
    expect(root.style.getPropertyValue("--profile-primary-action")).toBe(
      "#8a3f2d",
    );
    expect(screen.getByText("Profile content")).not.toBeNull();
  });

  it("uses the Basic-compatible fallback for an unknown persisted value", () => {
    render(
      <ProfileThemeRoot data-testid="theme-root" themeId="deleted-theme">
        Profile content
      </ProfileThemeRoot>,
    );

    const root = screen.getByTestId("theme-root");
    expect(root.getAttribute("data-profile-theme")).toBe("clinical-light");
    expect(root.style.getPropertyValue("--background")).toBe("#f3f3f1");
  });

  it("exposes the chooser card as a native named radio with visible state", () => {
    const onChange = mock(() => {});
    render(
      <fieldset>
        <legend>Choose a color theme</legend>
        <ProfileThemeChoice
          checked
          name="themeId"
          onChange={onChange}
          themeId="modern-specialist"
        />
        <ProfileThemeChoice
          checked={false}
          name="themeId"
          onChange={onChange}
          themeId="warm-care"
        />
      </fieldset>,
    );

    const radio = screen.getByRole("radio", {
      name: /Modern Specialist.*Selected/i,
    });
    expect(radio.getAttribute("name")).toBe("themeId");
    expect(radio.getAttribute("value")).toBe("modern-specialist");
    expect((radio as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("Selected")).not.toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Warm Care/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps an unavailable premium theme disabled and labelled", () => {
    render(
      <ProfileThemeChoice
        checked={false}
        disabled
        name="themeId"
        onChange={() => {}}
        themeId="premium-contrast"
      />,
    );

    const radio = screen.getByRole("radio", { name: /Premium Contrast/i });
    expect((radio as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/Dark navy surfaces/i)).not.toBeNull();
  });
});
