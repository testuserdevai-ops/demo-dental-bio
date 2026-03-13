import { withPublic } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';

export const POST = withPublic(async (request, { supabase }) => {
    const { email, otp, newPassword } = await request.json();

    // Validate input
    if (!email || !otp || !newPassword) {
      return apiResponse.badRequest("Email, OTP, and new password are required.");
    }

    if (newPassword.length < 6) {
      return apiResponse.badRequest("Password must be at least 6 characters long.");
    }

    // Verify OTP first
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email"
    });

    if (otpError) {
      return apiResponse.badRequest("Invalid or expired OTP.");
    }

    // Get the user session after OTP verification
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return apiResponse.badRequest("User not found or session invalid.");
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return apiResponse.badRequest(`Failed to update password: ${updateError.message}`);
    }

    return apiResponse.success({ message: "Password updated successfully." });
});
