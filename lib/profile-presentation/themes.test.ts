import { describe, expect, it } from "bun:test";

import { PROFILE_THEME_IDS } from "./catalog";
import {
  DEFAULT_PROFILE_THEME_ID,
  getContrastRatio,
  getProfileTheme,
  PROFILE_THEMES,
  profileThemeToCSSProperties,
  type ProfileThemeDefinition,
} from "./themes";

const AA_TEXT_CONTRAST = 4.5;
const NON_TEXT_CONTRAST = 3;

function textPairs(theme: ProfileThemeDefinition) {
  const token = theme.tokens;

  return [
    ["primary text on page", token.text, token.pageBackground],
    ["primary text on surface", token.text, token.surface],
    ["secondary text on page", token.textMuted, token.pageBackground],
    ["secondary text on surface", token.textMuted, token.surface],
    ["primary action", token.onPrimaryAction, token.primaryAction],
    ["primary hover", token.onPrimaryAction, token.primaryActionHover],
    ["primary active", token.onPrimaryAction, token.primaryActionActive],
    ["secondary action", token.onSecondaryAction, token.secondaryAction],
    ["secondary hover", token.onSecondaryAction, token.secondaryActionHover],
    ["secondary active", token.onSecondaryAction, token.secondaryActionActive],
    ["link on page", token.link, token.pageBackground],
    ["link on surface", token.link, token.surface],
    ["link hover on page", token.linkHover, token.pageBackground],
    ["link hover on surface", token.linkHover, token.surface],
    ["muted state", token.onMuted, token.muted],
    ["disabled state", token.onDisabled, token.disabled],
    ["selected state", token.onSelected, token.selected],
    ["success state", token.onSuccess, token.success],
    ["warning state", token.onWarning, token.warning],
    ["destructive/error state", token.onDestructive, token.destructive],
  ] as const;
}

function nonTextPairs(theme: ProfileThemeDefinition) {
  const token = theme.tokens;

  return [
    ["border on page", token.border, token.pageBackground],
    ["border on surface", token.border, token.surface],
    ["focus on page", token.focus, token.pageBackground],
    ["focus on surface", token.focus, token.surface],
    ["primary control on surface", token.primaryAction, token.surface],
  ] as const;
}

describe("curated profile themes", () => {
  it("defines every controlled catalog ID exactly once", () => {
    expect(Object.keys(PROFILE_THEMES)).toEqual([...PROFILE_THEME_IDS]);
    expect(
      new Set(Object.values(PROFILE_THEMES).map((theme) => theme.id)).size,
    ).toBe(PROFILE_THEME_IDS.length);
  });

  it("uses only concrete six-digit hex tokens", () => {
    for (const theme of Object.values(PROFILE_THEMES)) {
      for (const [tokenName, value] of Object.entries(theme.tokens)) {
        expect(
          /^#[0-9a-f]{6}$/.test(value),
          `${theme.id}.${tokenName} must be a controlled hex color`,
        ).toBe(true);
        expect(value).not.toContain("url");
        expect(value).not.toContain("var(");
        expect(value).not.toContain("gradient");
      }
    }
  });

  it("keeps all text and state pairs at WCAG AA contrast", () => {
    for (const theme of Object.values(PROFILE_THEMES)) {
      for (const [label, foreground, background] of textPairs(theme)) {
        expect(
          getContrastRatio(foreground, background),
          `${theme.id}: ${label}`,
        ).toBeGreaterThanOrEqual(AA_TEXT_CONTRAST);
      }
    }
  });

  it("keeps borders, focus rings, and primary controls distinguishable", () => {
    for (const theme of Object.values(PROFILE_THEMES)) {
      for (const [label, foreground, background] of nonTextPairs(theme)) {
        expect(
          getContrastRatio(foreground, background),
          `${theme.id}: ${label}`,
        ).toBeGreaterThanOrEqual(NON_TEXT_CONTRAST);
      }
    }
  });

  it("provides five visually distinct controlled palettes", () => {
    const signatures = Object.values(PROFILE_THEMES).map(
      ({ colorScheme, tokens }) =>
        `${colorScheme}:${tokens.pageBackground}:${tokens.primaryAction}:${tokens.selected}`,
    );

    expect(new Set(signatures).size).toBe(PROFILE_THEME_IDS.length);
  });

  it("falls back unknown and retired identifiers to Violet", () => {
    expect(getProfileTheme("retired-theme").id).toBe(DEFAULT_PROFILE_THEME_ID);
    expect(getProfileTheme(null).id).toBe(DEFAULT_PROFILE_THEME_ID);
    expect(getProfileTheme({ id: "warm-care" }).id).toBe(
      DEFAULT_PROFILE_THEME_ID,
    );
  });

  it("preserves the legacy Basic semantic color baseline", () => {
    const token = PROFILE_THEMES["clinical-light"].tokens;

    expect({
      pageBackground: token.pageBackground,
      surface: token.surface,
      text: token.text,
      textMuted: token.textMuted,
      primaryAction: token.primaryAction,
      secondaryAction: token.secondaryAction,
      borderSubtle: token.borderSubtle,
      focus: token.focus,
      muted: token.muted,
      disabled: token.disabled,
      success: token.success,
      warning: token.warning,
      destructive: token.destructive,
    }).toEqual({
      pageBackground: "#f3f3f1",
      surface: "#ffffff",
      text: "#121822",
      textMuted: "#4b5563",
      primaryAction: "#5046db",
      secondaryAction: "#d8d3fa",
      borderSubtle: "#e5e7eb",
      focus: "#7267e3",
      muted: "#f1f1f1",
      disabled: "#9ca3af",
      success: "#34d594",
      warning: "#e7b274",
      destructive: "#ef4444",
    });
  });

  it("maps controlled tokens to the shared semantic UI variables", () => {
    for (const theme of Object.values(PROFILE_THEMES)) {
      const style = profileThemeToCSSProperties(theme);
      expect(style.colorScheme).toBe(theme.colorScheme);
      expect(style["--background"]).toBe(theme.tokens.pageBackground);
      expect(style["--foreground"]).toBe(theme.tokens.text);
      expect(style["--primary"]).toBe(theme.tokens.primaryAction);
      expect(style["--primary-foreground"]).toBe(theme.tokens.onPrimaryAction);
      expect(style["--profile-primary-action-hover"]).toBe(
        theme.tokens.primaryActionHover,
      );
      expect(style["--border"]).toBe(theme.tokens.borderSubtle);
      expect(style["--profile-border"]).toBe(theme.tokens.border);
      expect(style["--ring"]).toBe(theme.tokens.focus);
      expect(style["--destructive"]).toBe(theme.tokens.destructive);
    }
  });
});
