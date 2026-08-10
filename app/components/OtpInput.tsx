"use client";

import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (otp: string) => void;
  onComplete?: (otp: string) => void;
  onOtpChange?: (otp: string[]) => void;
  name?: string;
  label?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  containerClassName?: string;
}

export interface OtpInputRef {
  reset: () => void;
  focus: () => void;
}

function toDigits(value: string | undefined, length: number) {
  const sanitized = (value ?? "").replace(/\D/g, "").slice(0, length);
  return Array.from({ length }, (_, index) => sanitized[index] ?? "");
}

const OtpInput = React.forwardRef<OtpInputRef, OtpInputProps>(
  (
    {
      length = 6,
      value,
      onChange,
      onComplete,
      onOtpChange,
      name,
      label = "Verification code",
      describedBy,
      invalid = false,
      disabled = false,
      loading = false,
      autoFocus = true,
      className,
      inputClassName,
      containerClassName,
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState("");
    const currentValue = value ?? internalValue;
    const digits = toDigits(currentValue, length);
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const lastCompletedValue = useRef("");

    const publish = (nextDigits: string[]) => {
      const nextValue = nextDigits.join("").slice(0, length);
      if (value === undefined) setInternalValue(nextValue);
      onChange?.(nextValue);
      onOtpChange?.(toDigits(nextValue, length));
    };

    useEffect(() => {
      if (currentValue.length === length && /^\d+$/.test(currentValue)) {
        if (lastCompletedValue.current !== currentValue) {
          lastCompletedValue.current = currentValue;
          onComplete?.(currentValue);
        }
      } else {
        lastCompletedValue.current = "";
      }
    }, [currentValue, length, onComplete]);

    useImperativeHandle(ref, () => ({
      reset() {
        publish(Array(length).fill(""));
        inputRefs.current[0]?.focus();
      },
      focus() {
        inputRefs.current[0]?.focus();
      },
    }));

    const setDigit = (index: number, rawValue: string) => {
      const incoming = rawValue.replace(/\D/g, "");
      const next = [...digits];
      if (incoming.length > 1) {
        incoming
          .slice(0, length)
          .split("")
          .forEach((digit, offset) => {
            if (index + offset < length) next[index + offset] = digit;
          });
        publish(next);
        inputRefs.current[
          Math.min(index + incoming.length, length - 1)
        ]?.focus();
        return;
      }

      next[index] = incoming;
      publish(next);
      if (incoming && index < length - 1) inputRefs.current[index + 1]?.focus();
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
      if (!pasted) return;
      event.preventDefault();
      const next = toDigits(pasted, length);
      publish(next);
      inputRefs.current[Math.min(pasted.length, length) - 1]?.focus();
    };

    const handleKeyDown = (
      index: number,
      event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        inputRefs.current[index - 1]?.focus();
      } else if (event.key === "ArrowRight" && index < length - 1) {
        event.preventDefault();
        inputRefs.current[index + 1]?.focus();
      } else if (event.key === "Backspace") {
        event.preventDefault();
        const next = [...digits];
        if (next[index]) {
          next[index] = "";
          publish(next);
        } else if (index > 0) {
          next[index - 1] = "";
          publish(next);
          inputRefs.current[index - 1]?.focus();
        }
      }
    };

    return (
      <div className={className}>
        {name && <input type="hidden" name={name} value={currentValue} />}
        <div
          role="group"
          aria-label={label}
          aria-describedby={describedBy}
          className={cn("flex justify-center gap-2", containerClassName)}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={index === 0 ? length : 1}
              value={digit}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              aria-label={`${label} digit ${index + 1} of ${length}`}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              disabled={disabled || loading}
              autoFocus={autoFocus && index === 0}
              className={cn(
                "size-12 rounded-[var(--radius-md)] border border-border bg-input text-center text-xl text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-destructive md:size-16 md:text-2xl",
                inputClassName,
              )}
            />
          ))}
        </div>
      </div>
    );
  },
);

OtpInput.displayName = "OtpInput";

export default OtpInput;
