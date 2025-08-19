"use client";

import { useState, useEffect, useRef } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [step, setStep] = useState<'email' | 'otp'>("email");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));
  const router = useRouter();

  const supabase = createClientComponentClient();

  const COOLDOWN_TIME = 60 * 1000; // 1-minute cooldown

  useEffect(() => {
    const savedCooldown = localStorage.getItem("resetCooldown");

    if (savedCooldown) {
      const timeLeft = Number(savedCooldown) - Date.now();
      if (timeLeft > 0) {
        setCooldown(timeLeft);

        const countdownInterval = setInterval(() => {
          setCooldown((prev) => {
            if (prev === null || prev <= 1000) {
              clearInterval(countdownInterval);
              return null;
            }
            return prev - 1000;
          });
        }, 1000);

        return () => clearInterval(countdownInterval);
      }
    }
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage("Please enter your email.");
      return;
    }

    if (cooldown) {
      setErrorMessage("Please wait before requesting another reset link.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setLoading(false);

    if (error) {
      setErrorMessage("Error sending reset email: " + error.message);
      setMessage(""); // Clear success message if error
    } else {
      setMessage("Check your email for the OTP code.");
      setErrorMessage(""); // Clear error message if success
      setCooldown(COOLDOWN_TIME);
      localStorage.setItem("resetCooldown", (Date.now() + COOLDOWN_TIME).toString());
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);

      // Start the countdown
      const countdownInterval = setInterval(() => {
        setCooldown((prev) => {
          if (prev === null || prev <= 1000) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1000;
        });
      }, 1000);

      // Clear countdown after timeout
      setTimeout(() => {
        setCooldown(null);
        localStorage.removeItem("resetCooldown");
        clearInterval(countdownInterval);
      }, COOLDOWN_TIME);
    }
  };

  const handleOtpChange = (idx: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    let newOtp = [...otp];
    if (value.length > 1) {
      // Handle paste
      const chars = value.split("").slice(0, 6);
      chars.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      // Focus next empty or last
      const nextIdx = chars.length < 6 ? chars.length : 5;
      otpRefs[nextIdx]?.current?.focus();
    } else {
      newOtp[idx] = value;
      setOtp(newOtp);
      if (value && idx < 5) {
        otpRefs[idx + 1]?.current?.focus();
      }
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs[idx - 1]?.current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (paste.length === 6) {
      setOtp(paste.split("").slice(0, 6));
      // Focus the last input
      setTimeout(() => otpRefs[5]?.current?.focus(), 0);
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (step === "otp" && otp.every((d) => d.length === 1)) {
      verifyOtp();
    }
    // eslint-disable-next-line
  }, [otp, step]);

  const verifyOtp = async () => {
    setOtpLoading(true);
    setErrorMessage("");
    const token = otp.join("");
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    setOtpLoading(false);
    if (error) {
      setErrorMessage("Invalid or expired OTP. Please try again or resend.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs[0]?.current?.focus();
    } else {
      // Success: redirect
      router.push("/update-password");
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setLoading(false);
    if (error) {
      setErrorMessage("Error resending OTP: " + error.message);
    } else {
      setMessage("OTP resent. Check your email.");
      setErrorMessage("");
      setOtp(["", "", "", "", "", ""]);
      otpRefs[0]?.current?.focus();
    }
  };

  const handleChangeEmail = () => {
    setStep("email");
    setOtp(["", "", "", "", "", ""]);
    setMessage("");
    setErrorMessage("");
  };

  return (
    <div className="text-center flex flex-col items-center py-10 gap-5 h-screen">
      <h2 className="text-lg font-semibold text-dark">Forgot Password?</h2>
      {step === "email" && (
        <form onSubmit={handlePasswordReset} className="w-full max-w-xl">
          {/* Email Input Field */}
          <div className="relative z-50 font-semibold left-1/2 top-5 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5">
            <div className="max-w-xl w-full rounded-[40px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-4 px-3 flex items-center justify-between transition-all duration-300 ease-in-out">
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-transparent text-2xl text-dark px-4 py-1.5 outline-none placeholder-neutral-500"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="relative z-50 left-1/2 top-10 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5 mb-5">
            <button
              type="submit"
              disabled={loading || cooldown !== null}
              className={`w-full text-2xl font-semibold bg-gradient-to-r from-[#d47e8b] via-[#d47e8b] to-[#e09f7e] text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent py-5 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none ${loading || cooldown !== null ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              {loading
                ? "Sending..."
                : cooldown
                  ? `Try again in ${Math.ceil(cooldown / 1000)}s`
                  : "Send Verification Email"}
            </button>
          </div>
        </form>
      )}
      {step === "otp" && (
        <>
          <div className="flex justify-center gap-2 mt-6">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={otpRefs[idx]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(idx, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(idx, e)}
                onPaste={handleOtpPaste}
                className="w-16 h-16 text-2xl text-center border rounded-[16px] border-neutral-300 bg-white shadow-sm"
                disabled={otpLoading}
                autoFocus={idx === 0}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">Enter the 6-digit code sent to your email.</p>
          {otpLoading && (
            <div className="flex justify-center items-center mt-4 mb-2">
              <svg className="animate-spin h-7 w-7 text-[#d47e8b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span className="ml-2 text-[#d47e8b] font-medium text-lg">Verifying...</span>
            </div>
          )}
          {errorMessage && (
            <div className="pt-2 text-red-600">
              <p>{errorMessage}</p>
            </div>
          )}
          <div className="flex flex-col justify-center items-center w-full px-5">
            <button
              onClick={handleResendOtp}
              disabled={loading || otpLoading || cooldown !== null}
              className="mt-4 max-w-xl w-full text-lg font-semibold bg-gradient-to-r from-[#d47e8b] via-[#d47e8b] to-[#e09f7e] text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent py-3 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Resending..."
                : cooldown !== null
                  ? `Try again in ${Math.ceil(cooldown / 1000)}s`
                  : "Resend OTP"}
            </button>
            <button
              onClick={handleChangeEmail}
              className="mt-2 max-w-xl w-full text-lg font-semibold bg-white text-[#d47e8b] rounded-[40px] border-[0.6px] border-[#d47e8b] shadow-sm py-3 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none"
            >
              Change Email
            </button>
          </div>
        </>
      )}
    </div>
  );
}
