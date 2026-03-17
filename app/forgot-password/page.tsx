"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useSearchParams } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/utils/Toast";
import OtpInput from "../components/OtpInput";
import { passwordRules } from "@/lib/validation";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>("email");
  const [otp, setOtp] = useState<string[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);
  const searchParams = useSearchParams();

  // Password update state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState<{ id: string; label: string; passed: boolean }[]>([]);
  const [confirmError, setConfirmError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const supabase = createClientComponentClient();

  const COOLDOWN_TIME = 60 * 1000; // 1-minute cooldown

  useEffect(() => {
    const savedCooldown = localStorage.getItem("resetCooldown");
    let countdownInterval: NodeJS.Timeout;

    if (savedCooldown) {
      const timeLeft = Number(savedCooldown) - Date.now();
      if (timeLeft > 0) {
        setCooldown(timeLeft);

        countdownInterval = setInterval(() => {
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

    return () => clearInterval(countdownInterval);
  }, []);

  // Check for email and step in query params
  useEffect(() => {
    const emailParam = searchParams.get('email');

    if (emailParam) {
      setEmail(emailParam);
      setStep('otp');
    }
  }, [searchParams]);

  // Live password validation
  useEffect(() => {
    setPasswordRequirements(passwordRules.map(rule => ({
      id: rule.id,
      label: rule.label,
      passed: rule.validate(newPassword),
    })));
  }, [newPassword]);

  const sendOtp = async ({ isResend = false }: { isResend?: boolean } = {}) => {
    if (!email) {
      showErrorToast("Please enter your email.");
      return;
    }

    if (cooldown && !isResend) {
      showErrorToast("Please wait before requesting another reset link.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password`,
    });
    setLoading(false);

    if (error) {
      showErrorToast(`${isResend ? "Error resending" : "Error sending"} OTP: ${error.message}`);
      return;
    }

    setOtp(["", "", "", "", "", ""]);

    // Reset cooldown for both first send and resend
    setCooldown(COOLDOWN_TIME);
    localStorage.setItem("resetCooldown", (Date.now() + COOLDOWN_TIME).toString());

    // Start countdown
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

    showSuccessToast("If an account exists with this email, you will receive a reset code.");

    if (!isResend) {
      setStep("otp");
    }
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    sendOtp();
  };

  const handleResendOtp = () => {
    sendOtp({ isResend: true });
  };

  const handleOtpChange = (newOtp: string[]) => {
    setOtp(newOtp);
  };

  const handleOtpComplete = (otpString: string) => {
    verifyOtp(otpString);
  };

  const verifyOtp = async (otpString?: string) => {
    setOtpLoading(true);
    const token = otpString || otp.join("");
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    setOtpLoading(false);
    if (error) {
      showErrorToast("Invalid or expired OTP. Please try again or resend.");
      setOtp([]);
    } else {
      // Session is now active in this client — move to password step
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      setStep("newPassword");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const allPassed = passwordRules.every(rule => rule.validate(newPassword));
    if (!allPassed) {
      showErrorToast("Please meet all password requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }
    setConfirmError("");
    setIsUpdating(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (!error) {
      showSuccessToast("Password updated successfully!");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } else {
      showErrorToast(`Failed to update password: ${error.message}`);
    }
    setIsUpdating(false);
  };

  const handleChangeEmail = () => {
    setStep("email");
    setOtp([]);
    setCooldown(null);
    localStorage.removeItem("resetCooldown");
  };

  return (
    <div className="text-center flex flex-col items-center py-10 gap-5 h-screen">
      <h2 className="text-lg font-semibold text-dark">
        {step === "newPassword" ? "Set New Password" : "Forgot Password?"}
      </h2>

      {/* Step 1: Email */}
      {step === "email" && (
        <form onSubmit={handlePasswordReset} className="w-full max-w-xl">
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
                disabled={searchParams.get('email') !== null}
              />
            </div>
          </div>

          <div className="relative z-50 left-1/2 top-10 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5 mb-5">
            <button
              type="submit"
              disabled={loading || cooldown !== null}
              className={`w-full text-2xl font-semibold bg-gradient-to-r from-btn-gradient-rose via-btn-gradient-rose to-btn-gradient-peach text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent py-5 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none ${loading || cooldown !== null ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              {loading
                ? "Sending..."
                : cooldown
                  ? `Try again in ${Math.ceil(cooldown / 1000)}s`
                  : searchParams.get('email') ? "Send Verification Email" : "Verify Email"}
            </button>
          </div>
        </form>
      )}

      {/* Step 2: OTP */}
      {step === "otp" && (
        <>
          <OtpInput
            length={6}
            onOtpChange={handleOtpChange}
            onComplete={handleOtpComplete}
            disabled={otpLoading}
            loading={otpLoading}
            className="mt-6"
          />
          <p className="text-sm text-gray-500 mt-2">Enter the 6-digit code sent to your email.</p>
          {otpLoading && (
            <div className="flex justify-center items-center mt-4 mb-2">
              <svg className="animate-spin h-7 w-7 text-btn-gradient-rose" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span className="ml-2 text-btn-gradient-rose font-medium text-lg">Verifying...</span>
            </div>
          )}
          <div className="flex flex-col justify-center items-center w-full px-5">
            <button
              onClick={handleResendOtp}
              disabled={loading || otpLoading || cooldown !== null}
              className="mt-4 max-w-xl w-full text-lg font-semibold bg-gradient-to-r from-btn-gradient-rose via-btn-gradient-rose to-btn-gradient-peach text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent py-3 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Resending..."
                : cooldown !== null
                  ? `Try again in ${Math.ceil(cooldown / 1000)}s`
                  : "Resend OTP"}
            </button>
            <button
              onClick={handleChangeEmail}
              className="mt-2 max-w-xl w-full text-lg font-semibold bg-white text-btn-gradient-rose rounded-[40px] border-[0.6px] border-btn-gradient-rose shadow-sm py-3 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none"
            >
              Change Email
            </button>
          </div>
        </>
      )}

      {/* Step 3: New Password */}
      {step === "newPassword" && (
        <form onSubmit={handleUpdatePassword} className="w-full max-w-xl">
          <div className="relative z-50 font-semibold left-1/2 top-5 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5">
            {/* New Password */}
            <div className="max-w-xl w-full rounded-[40px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-4 px-3 flex items-center justify-between transition-all duration-300 ease-in-out">
              <div className="flex items-center w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-transparent text-2xl text-dark px-4 py-1.5 outline-none placeholder-neutral-500"
                />
                {newPassword && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="flex-shrink-0 pr-4 text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Password Requirements */}
            {newPassword && (
              <div className="text-left pl-7 mt-3 space-y-0.5">
                {passwordRequirements.map(rule => (
                  <div key={rule.id} className={`flex items-center gap-2 ${rule.passed ? "text-primary-green-1" : "text-red-500"}`}>
                    {rule.passed ? <CheckCircleIcon /> : <XCircleIcon />}
                    <span className="text-sm">{rule.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm Password */}
            <div className="mt-5">
              <div className={`max-w-xl w-full rounded-[40px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg ${confirmError ? "border-red-500" : "border-neutral-300"} py-4 px-3 flex items-center justify-between transition-all duration-300 ease-in-out`}>
                <div className="flex items-center w-full">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setConfirmError(""); }}
                    required
                    className="w-full bg-transparent text-2xl text-dark px-4 py-1.5 outline-none placeholder-neutral-500"
                  />
                  {confirmPassword && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      className="flex-shrink-0 pr-4 text-neutral-400 hover:text-neutral-600 transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {confirmError && (
                <div className="text-red-500 text-sm font-medium pl-7 mt-2">{confirmError}</div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isUpdating}
              className={`mt-10 w-full text-2xl font-semibold bg-gradient-to-r from-btn-gradient-rose via-btn-gradient-rose to-btn-gradient-peach text-white rounded-[40px] border-[0.6px] shadow-sm bg-opacity-90 backdrop-blur-lg border-transparent py-5 px-4 transition-all duration-300 ease-in-out hover:bg-opacity-80 focus:outline-none ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isUpdating ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
