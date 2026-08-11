import type { CSSProperties } from "react";

import { PROFILE_THEME_IDS, type ProfileThemeId } from "./catalog";

export const DEFAULT_PROFILE_THEME_ID = "clinical-light" as const;

export type ProfileThemeTokens = {
  pageBackground: string;
  surface: string;
  text: string;
  textMuted: string;
  primaryAction: string;
  onPrimaryAction: string;
  primaryActionHover: string;
  primaryActionActive: string;
  secondaryAction: string;
  onSecondaryAction: string;
  secondaryActionHover: string;
  secondaryActionActive: string;
  border: string;
  focus: string;
  link: string;
  linkHover: string;
  muted: string;
  onMuted: string;
  disabled: string;
  onDisabled: string;
  selected: string;
  onSelected: string;
  success: string;
  onSuccess: string;
  warning: string;
  onWarning: string;
  destructive: string;
  onDestructive: string;
};

export type ProfileThemeDefinition = {
  id: ProfileThemeId;
  displayName: string;
  description: string;
  mood: string;
  colorScheme: "light" | "dark";
  tokens: ProfileThemeTokens;
};

/**
 * The source-controlled theme palette. Values are deliberately concrete hex
 * colors: profile configuration stores an ID, never owner-provided CSS.
 */
export const PROFILE_THEMES = {
  "clinical-light": {
    id: "clinical-light",
    displayName: "Clinical Light",
    description: "A calm neutral base with a precise violet action color.",
    mood: "Clear, familiar, and quietly clinical",
    colorScheme: "light",
    tokens: {
      pageBackground: "#f3f3f1",
      surface: "#ffffff",
      text: "#121822",
      textMuted: "#4b5563",
      primaryAction: "#5046db",
      onPrimaryAction: "#ffffff",
      primaryActionHover: "#302a83",
      primaryActionActive: "#241f66",
      secondaryAction: "#d8d3fa",
      onSecondaryAction: "#121822",
      secondaryActionHover: "#c4bcf2",
      secondaryActionActive: "#aea4e9",
      border: "#747984",
      focus: "#5046db",
      link: "#4036bd",
      linkHover: "#302a83",
      muted: "#e1e2e1",
      onMuted: "#374151",
      disabled: "#676e78",
      onDisabled: "#ffffff",
      selected: "#5046db",
      onSelected: "#ffffff",
      success: "#177245",
      onSuccess: "#ffffff",
      warning: "#8a4b08",
      onWarning: "#ffffff",
      destructive: "#b4232c",
      onDestructive: "#ffffff",
    },
  },
  "warm-care": {
    id: "warm-care",
    displayName: "Warm Care",
    description: "Soft porcelain and terracotta balanced by a teal focus cue.",
    mood: "Human, reassuring, and family friendly",
    colorScheme: "light",
    tokens: {
      pageBackground: "#fbf6f1",
      surface: "#fffdf9",
      text: "#2f211c",
      textMuted: "#65534b",
      primaryAction: "#8a3f2d",
      onPrimaryAction: "#ffffff",
      primaryActionHover: "#6f3023",
      primaryActionActive: "#57251c",
      secondaryAction: "#f1d4c4",
      onSecondaryAction: "#3d231b",
      secondaryActionHover: "#e7bea8",
      secondaryActionActive: "#dca88d",
      border: "#847168",
      focus: "#175b63",
      link: "#763522",
      linkHover: "#57251c",
      muted: "#e8ddd5",
      onMuted: "#4f3d35",
      disabled: "#6f625c",
      onDisabled: "#ffffff",
      selected: "#175b63",
      onSelected: "#ffffff",
      success: "#17603a",
      onSuccess: "#ffffff",
      warning: "#8f5200",
      onWarning: "#ffffff",
      destructive: "#a12626",
      onDestructive: "#ffffff",
    },
  },
  "editorial-expert": {
    id: "editorial-expert",
    displayName: "Editorial Expert",
    description: "Paper, deep ink, and mineral green with a copper accent.",
    mood: "Authoritative, considered, and editorial",
    colorScheme: "light",
    tokens: {
      pageBackground: "#f4f1ea",
      surface: "#fffefb",
      text: "#1d2528",
      textMuted: "#4e5a5d",
      primaryAction: "#183e49",
      onPrimaryAction: "#ffffff",
      primaryActionHover: "#0f3039",
      primaryActionActive: "#09252d",
      secondaryAction: "#d8e0dc",
      onSecondaryAction: "#152a28",
      secondaryActionHover: "#c3d0ca",
      secondaryActionActive: "#aebfb7",
      border: "#747e7b",
      focus: "#8b3e08",
      link: "#175361",
      linkHover: "#0f3d47",
      muted: "#e2ded5",
      onMuted: "#3c4849",
      disabled: "#687275",
      onDisabled: "#ffffff",
      selected: "#8b3e08",
      onSelected: "#ffffff",
      success: "#21613c",
      onSuccess: "#ffffff",
      warning: "#865000",
      onWarning: "#ffffff",
      destructive: "#9f2d33",
      onDestructive: "#ffffff",
    },
  },
  "modern-specialist": {
    id: "modern-specialist",
    displayName: "Modern Specialist",
    description: "Clean ice blue surfaces with a confident deep cyan action.",
    mood: "Technical, fresh, and specialist led",
    colorScheme: "light",
    tokens: {
      pageBackground: "#edf6f7",
      surface: "#ffffff",
      text: "#102b34",
      textMuted: "#405b63",
      primaryAction: "#006678",
      onPrimaryAction: "#ffffff",
      primaryActionHover: "#004f5e",
      primaryActionActive: "#003b47",
      secondaryAction: "#c6eaee",
      onSecondaryAction: "#083842",
      secondaryActionHover: "#a9dce2",
      secondaryActionActive: "#8dcdd5",
      border: "#657e84",
      focus: "#6d28d9",
      link: "#005567",
      linkHover: "#003f4d",
      muted: "#dcebed",
      onMuted: "#304d55",
      disabled: "#60747a",
      onDisabled: "#ffffff",
      selected: "#6d28d9",
      onSelected: "#ffffff",
      success: "#12633d",
      onSuccess: "#ffffff",
      warning: "#8a5100",
      onWarning: "#ffffff",
      destructive: "#aa2933",
      onDestructive: "#ffffff",
    },
  },
  "premium-contrast": {
    id: "premium-contrast",
    displayName: "Premium Contrast",
    description: "Dark navy surfaces with luminous aqua and warm gold actions.",
    mood: "Confident, elevated, and high contrast",
    colorScheme: "dark",
    tokens: {
      pageBackground: "#101318",
      surface: "#191f27",
      text: "#f8fafc",
      textMuted: "#cbd5e1",
      primaryAction: "#f6c453",
      onPrimaryAction: "#211600",
      primaryActionHover: "#ffda83",
      primaryActionActive: "#dfa92b",
      secondaryAction: "#344358",
      onSecondaryAction: "#ffffff",
      secondaryActionHover: "#40536d",
      secondaryActionActive: "#4d6381",
      border: "#8498b0",
      focus: "#70d6ff",
      link: "#86e1ff",
      linkHover: "#b8efff",
      muted: "#26303d",
      onMuted: "#d6dee8",
      disabled: "#788596",
      onDisabled: "#101318",
      selected: "#70d6ff",
      onSelected: "#08202a",
      success: "#45cf88",
      onSuccess: "#0d2017",
      warning: "#f2b94b",
      onWarning: "#251900",
      destructive: "#ff7a85",
      onDestructive: "#2a0a0d",
    },
  },
} as const satisfies Record<ProfileThemeId, ProfileThemeDefinition>;

export function isProfileThemeId(value: unknown): value is ProfileThemeId {
  return (
    typeof value === "string" &&
    (PROFILE_THEME_IDS as readonly string[]).includes(value)
  );
}

export function getProfileTheme(value: unknown): ProfileThemeDefinition {
  return PROFILE_THEMES[
    isProfileThemeId(value) ? value : DEFAULT_PROFILE_THEME_ID
  ];
}

type ProfileThemeCustomProperty =
  | `--profile-${string}`
  | `--${
      | "background"
      | "foreground"
      | "card"
      | "card-foreground"
      | "popover"
      | "popover-foreground"
      | "muted"
      | "muted-foreground"
      | "primary"
      | "primary-foreground"
      | "secondary"
      | "secondary-foreground"
      | "accent"
      | "accent-foreground"
      | "destructive"
      | "destructive-foreground"
      | "border"
      | "input"
      | "ring"
      | "disabled"
      | "placeholder"
      | "success"
      | "warning"
      | "info"}`;

export type ProfileThemeCSSProperties = CSSProperties &
  Record<ProfileThemeCustomProperty, string>;

export function profileThemeToCSSProperties(
  theme: ProfileThemeDefinition,
): ProfileThemeCSSProperties {
  const token = theme.tokens;

  return {
    colorScheme: theme.colorScheme,
    "--profile-page-background": token.pageBackground,
    "--profile-surface": token.surface,
    "--profile-text": token.text,
    "--profile-text-muted": token.textMuted,
    "--profile-primary-action": token.primaryAction,
    "--profile-on-primary-action": token.onPrimaryAction,
    "--profile-primary-action-hover": token.primaryActionHover,
    "--profile-primary-action-active": token.primaryActionActive,
    "--profile-secondary-action": token.secondaryAction,
    "--profile-on-secondary-action": token.onSecondaryAction,
    "--profile-secondary-action-hover": token.secondaryActionHover,
    "--profile-secondary-action-active": token.secondaryActionActive,
    "--profile-border": token.border,
    "--profile-focus": token.focus,
    "--profile-link": token.link,
    "--profile-link-hover": token.linkHover,
    "--profile-muted": token.muted,
    "--profile-on-muted": token.onMuted,
    "--profile-disabled": token.disabled,
    "--profile-on-disabled": token.onDisabled,
    "--profile-selected": token.selected,
    "--profile-on-selected": token.onSelected,
    "--profile-success": token.success,
    "--profile-on-success": token.onSuccess,
    "--profile-warning": token.warning,
    "--profile-on-warning": token.onWarning,
    "--profile-destructive": token.destructive,
    "--profile-on-destructive": token.onDestructive,
    "--background": token.pageBackground,
    "--foreground": token.text,
    "--card": token.surface,
    "--card-foreground": token.text,
    "--popover": token.surface,
    "--popover-foreground": token.text,
    "--muted": token.muted,
    "--muted-foreground": token.onMuted,
    "--primary": token.primaryAction,
    "--primary-foreground": token.onPrimaryAction,
    "--secondary": token.secondaryAction,
    "--secondary-foreground": token.onSecondaryAction,
    "--accent": token.selected,
    "--accent-foreground": token.onSelected,
    "--destructive": token.destructive,
    "--destructive-foreground": token.onDestructive,
    "--border": token.border,
    "--input": token.surface,
    "--ring": token.focus,
    "--disabled": token.disabled,
    "--placeholder": token.textMuted,
    "--success": token.success,
    "--warning": token.warning,
    "--info": token.link,
  };
}

function relativeLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}
