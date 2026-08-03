import { withPublic } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";

export const POST = withPublic(async (request, { supabase }) => {
  const { email, otp, newPassword } = await request.json();

  // Validate input
  if (!email || !otp || !newPassword) {
    return apiResponse.badRequest("Email, OTP, and new password are required.");
  }

  // Apply same password rules as registration
  if (newPassword.length < 8) {
    return apiResponse.badRequest(
      "Password must be at least 8 characters long.",
    );
  }
  if (!/[A-Z]/.test(newPassword)) {
    return apiResponse.badRequest(
      "Password must contain at least one uppercase letter.",
    );
  }
  if (!/[a-z]/.test(newPassword)) {
    return apiResponse.badRequest(
      "Password must contain at least one lowercase letter.",
    );
  }
  if (!/[0-9]/.test(newPassword)) {
    return apiResponse.badRequest("Password must contain at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    return apiResponse.badRequest(
      "Password must contain at least one special character.",
    );
  }

  // Verify OTP first
  const { error: otpError } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "recovery",
  });

  if (otpError) {
    return apiResponse.badRequest("Invalid or expired OTP.");
  }

  // Get the user session after OTP verification
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return apiResponse.badRequest("User not found or session invalid.");
  }

  // Update the user's password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return apiResponse.badRequest(
      `Failed to update password: ${updateError.message}`,
    );
  }

  return apiResponse.success({ message: "Password updated successfully." });
});
