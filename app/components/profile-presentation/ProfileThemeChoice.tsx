"use client";

import { useId, type ChangeEventHandler } from "react";

import {
  getProfileTheme,
  profileThemeToCSSProperties,
} from "@/lib/profile-presentation/themes";
import type { ProfileThemeId } from "@/lib/profile-presentation/catalog";

import styles from "./ProfileThemeChoice.module.css";

type ProfileThemeChoiceProps = {
  checked: boolean;
  disabled?: boolean;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  themeId: ProfileThemeId;
};

/**
 * A native-radio theme option for onboarding/editor composition. Selection is
 * communicated through checked state, text, shape, and color.
 */
export function ProfileThemeChoice({
  checked,
  disabled = false,
  name,
  onChange,
  themeId,
}: ProfileThemeChoiceProps) {
  const theme = getProfileTheme(themeId);
  const accessibleId = useId();

  return (
    <label
      className={styles.label}
      data-profile-theme-choice={theme.id}
      style={profileThemeToCSSProperties(theme)}
    >
      <input
        aria-describedby={`${accessibleId}-description ${accessibleId}-mood`}
        aria-labelledby={`${accessibleId}-name`}
        checked={checked}
        className={styles.input}
        disabled={disabled}
        name={name}
        onChange={onChange}
        type="radio"
        value={theme.id}
      />
      <span className={styles.card}>
        <span aria-hidden="true" className={styles.preview}>
          <span className={styles.avatar}>DB</span>
          <span className={styles.sampleLines}>
            <span className={styles.sampleLine} />
            <span className={styles.sampleLineShort} />
          </span>
          <span className={styles.actionSample}>Book an appointment</span>
        </span>
        <span className={styles.headingRow}>
          <span className={styles.name} id={`${accessibleId}-name`}>
            {theme.displayName}
          </span>
          {checked && (
            <span className={styles.state}>
              <span aria-hidden="true">✓</span>
              Selected
            </span>
          )}
        </span>
        <span className={styles.description} id={`${accessibleId}-description`}>
          {theme.description}
        </span>
        <span className={styles.mood} id={`${accessibleId}-mood`}>
          {theme.mood}
        </span>
      </span>
    </label>
  );
}
