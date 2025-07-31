"use client";

import { useState } from "react";
import { supabase } from "./utils/supabaseClient"; // Adjust the path to your Supabase client

interface ForgotPasswordFormProps {
  defaultEmail: string;
}

export default function ForgotPasswordForm({ defaultEmail }: ForgotPasswordFormProps) {
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>(defaultEmail);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setLoading(false);

    if (error) {
      setErrorMessage("Error sending reset email: " + error.message);
      setMessage(""); // Clear success message if error
    } else {
      setMessage("Check your email for the password reset link.");
      setErrorMessage(""); // Clear error message if success
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
          Forgot password?
        </h2>

        <div className="text-sm text-gray-500 my-1 ml-2">Please enter the email address associated with your account, and we'll send you a link to reset your password.</div>

        <input
          type="email"
          name="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 rounded-[26px] py-2 mb-3 text-base px-3 placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal"
        />
        {/* Submit Button */}

        <button
          type="submit"
          disabled={loading}
          className={`bg-primary-1 hover:bg-[#302A83] transition-all text-white p-2 rounded-[26px] py-2 text-lg px-3 font-semibold flex items-center mb-4 gap-2 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      {/* Message Handling */}
      {message && (
        <div className="pt-6 text-green-600">
          <p>{message}</p>
        </div>
      )}

      {errorMessage && (
        <div className="pt-6 text-red-600">
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
