"use client";

import { useId, type ChangeEventHandler } from "react";

import {
  getProfileTheme,
  profileThemeToCSSProperties,
} from "@/lib/profile-presentation/themes";
import type { ProfileThemeId } from "@/lib/profile-presentation/catalog";

import styles from "./ProfileThemeChoice.module.css";

type ProfileThemeChoiceProps = {
  availabilityDescriptionId?: string;
  checked: boolean;
  disabled?: boolean;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  statusLabel?: string;
  themeId: ProfileThemeId;
};

/**
 * A native-radio theme option for onboarding/editor composition. Selection is
 * communicated through checked state, text, shape, and color.
 */
export function ProfileThemeChoice({
  availabilityDescriptionId,
  checked,
  disabled = false,
  name,
  onChange,
  statusLabel,
  themeId,
}: ProfileThemeChoiceProps) {
  const theme = getProfileTheme(themeId);
  const accessibleId = useId();
  const describedBy = [availabilityDescriptionId?.trim() || undefined]
    .filter((id): id is string => Boolean(id))
    .join(" ");

  return (
    <label
      className={styles.label}
      data-profile-theme-choice={theme.id}
      style={profileThemeToCSSProperties(theme)}
    >
      <input
        aria-describedby={describedBy || undefined}
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
        <span aria-hidden="true" className={styles.indicator}>
          {checked ? "✓" : null}
        </span>
        <span className={styles.content}>
          <span className={styles.name} id={`${accessibleId}-name`}>
            {theme.displayName}
          </span>
          <span aria-hidden="true" className={styles.swatches}>
            <span className={styles.pageSwatch} />
            <span className={styles.textSwatch} />
            <span className={styles.primarySwatch} />
            <span className={styles.secondarySwatch} />
          </span>
        </span>
        {statusLabel ? (
          <span className={styles.status}>{statusLabel}</span>
        ) : null}
      </span>
    </label>
  );
}
