"use client";

import { useId } from "react";
import { normalizeBirthday } from "../_lib/date";

type DateOfBirthFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
};

export function DateOfBirthField({
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: DateOfBirthFieldProps) {
  const descriptionId = useId();
  const errorId = useId();

  const normalize = (candidate: string) => {
    const normalized = normalizeBirthday(candidate);
    if (normalized) onChange(normalized);
  };

  return (
    <div className="space-y-1.5">
      <label
        className="text-sm font-semibold text-foreground"
        htmlFor="birthday"
      >
        Date of birth
      </label>
      <input
        id="birthday"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          normalize(value);
          onBlur();
        }}
        onPaste={(event) => {
          const normalized = normalizeBirthday(
            event.clipboardData.getData("text"),
          );
          if (normalized) {
            event.preventDefault();
            onChange(normalized);
          }
        }}
        placeholder="DD/MM/YYYY"
        inputMode="numeric"
        autoComplete="bday"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
        disabled={disabled}
        className="flex h-11 w-full rounded-[var(--radius-md)] border border-border bg-input px-3 py-2 text-base text-foreground placeholder:text-placeholder focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive"
      />
      <p id={descriptionId} className="text-sm text-muted-foreground">
        Use DD/MM/YYYY. You must be at least 18 years old.
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
