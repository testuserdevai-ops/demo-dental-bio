"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { showSuccessToast } from "@/utils/Toast";

interface ForgotPasswordFormProps {
  defaultEmail: string;
}

export default function ForgotPasswordForm({
  defaultEmail,
}: ForgotPasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        defaultEmail,
        {
          redirectTo: `${window.location.origin}/forgot-password`,
        },
      );

      if (error) {
        setErrorMessage("Error sending reset email: " + error.message);
      } else {
        localStorage.setItem(
          "resetCooldown",
          (Date.now() + 60 * 1000).toString(),
        );
        showSuccessToast("Check your email for the OTP code.");
        // Successfully sent email, now redirect to OTP verification page
        router.push(
          `/forgot-password?email=${encodeURIComponent(defaultEmail)}`,
        );
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form
        onSubmit={handlePasswordReset}
        className="w-full flex flex-col items-end"
      >
        {/* Email Field */}
        <h2 className="text-lg font-semibold text-dark text-start w-full mb-0">
          Reset password
        </h2>

        <div className="text-sm text-gray-500 my-1">
          Please enter the email address associated with your account, and we'll
          send you a link to reset your password.
        </div>

        <input
          type="email"
          name="email"
          value={defaultEmail}
          readOnly
          className="w-full p-2 rounded-[26px] py-2 mb-3 text-base px-3 placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal bg-gray-100 cursor-not-allowed"
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`bg-primary-1 hover:bg-deep-purple transition-all text-white p-2 rounded-[26px] py-2 text-lg px-3 font-semibold flex items-center mb-4 gap-2 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Sending..." : "Verify Email"}
        </button>
      </form>

      {/* Error Message */}
      {errorMessage && (
        <div className="pt-2 text-red-600">
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
