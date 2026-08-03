"use client";

import React, { useState, useRef, useEffect } from "react";

interface OtpInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  onOtpChange?: (otp: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  containerClassName?: string;
}

interface OtpInputRef {
  reset: () => void;
  focus: () => void;
}

const OtpInput = React.forwardRef<OtpInputRef, OtpInputProps>(({
  length = 6,
  onComplete,
  onOtpChange,
  disabled = false,
  loading = false,
  autoFocus = true,
  className = "",
  inputClassName = "",
  containerClassName = "",
}, ref) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Handle OTP input changes
  const handleOtpChange = (idx: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    
    let newOtp = [...otp];
    if (value.length > 1) {
      // Handle paste
      const chars = value.split("").slice(0, length);
      chars.forEach((char, i) => {
        if (i < length) newOtp[i] = char;
      });
      setOtp(newOtp);
      // Focus next empty or last
      const nextIdx = chars.length < length ? chars.length : length - 1;
      otpRefs.current[nextIdx]?.focus();
    } else {
      newOtp[idx] = value;
      setOtp(newOtp);
      if (value && idx < length - 1) {
        otpRefs.current[idx + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (paste.length === length) {
      setOtp(paste.split("").slice(0, length));
      // Focus the last input
      setTimeout(() => otpRefs.current[length - 1]?.focus(), 0);
      e.preventDefault();
    }
  };

  // Call onOtpChange whenever otp changes
  useEffect(() => {
    onOtpChange?.(otp);
  }, [otp, onOtpChange]);

  // Auto-complete when all digits are entered
  useEffect(() => {
    if (otp.every((d) => d.length === 1)) {
      // console.log("Calling Verify OTP")
      onComplete?.(otp.join(""));
    }
  }, [onComplete, otp]);

  // Reset OTP
  const resetOtp = () => {
    setOtp(Array(length).fill(""));
    otpRefs.current[0]?.focus();
  };

  // Expose reset function via ref if needed
  React.useImperativeHandle(ref, () => ({
    reset: resetOtp,
    focus: () => otpRefs.current[0]?.focus(),
  }));

  const defaultInputClassName = "w-12 h-12 text-xl md:w-16 md:h-16 md:text-2xl text-center border rounded-[16px] border-neutral-300 bg-white shadow-sm";
  const defaultContainerClassName = "flex justify-center gap-2";

  return (
    <div className={`${defaultContainerClassName} ${containerClassName} ${className}`}>
      {otp.map((digit, idx) => (
        <input
          key={idx}
          ref={(element) => {
            otpRefs.current[idx] = element;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleOtpChange(idx, e.target.value)}
          onKeyDown={e => handleOtpKeyDown(idx, e)}
          onPaste={handleOtpPaste}
          className={`${defaultInputClassName} ${inputClassName}`}
          disabled={disabled || loading}
          autoFocus={autoFocus && idx === 0}
        />
      ))}
    </div>
  );
});

OtpInput.displayName = 'OtpInput';

export default OtpInput;
