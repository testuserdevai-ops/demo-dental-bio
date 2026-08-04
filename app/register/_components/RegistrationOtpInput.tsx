"use client";

import { useEffect, useId, useRef } from "react";

type RegistrationOtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

export function RegistrationOtpInput({
  value,
  onChange,
  error,
  disabled,
}: RegistrationOtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const descriptionId = useId();
  const errorId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-2">
      <label
        className="text-sm font-semibold text-foreground"
        htmlFor="registration-otp"
      >
        Verification code
      </label>
      <input
        ref={inputRef}
        id="registration-otp"
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, 6))
        }
        onPaste={(event) => {
          const digits = event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);
          if (digits) {
            event.preventDefault();
            onChange(digits);
          }
        }}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
        disabled={disabled}
        className="flex h-14 w-full rounded-[var(--radius-md)] border border-border bg-input px-3 text-center text-2xl tracking-[0.5em] text-foreground focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive"
      />
      <p id={descriptionId} className="text-sm text-muted-foreground">
        Enter or paste the six-digit code sent to your email.
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
