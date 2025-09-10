import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  
  try {
    const { email, otp, newPassword } = await request.json();

    // Validate input
    if (!email || !otp || !newPassword) {
      return NextResponse.json({ 
        error: "Email, OTP, and new password are required." 
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ 
        error: "Password must be at least 6 characters long." 
      }, { status: 400 });
    }

    // Verify OTP first
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email"
    });

    if (otpError) {
      return NextResponse.json({ 
        error: "Invalid or expired OTP." 
      }, { status: 400 });
    }

    // Get the user session after OTP verification
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: "User not found or session invalid." 
      }, { status: 400 });
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return NextResponse.json({ 
        error: `Failed to update password: ${updateError.message}` 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      message: "Password updated successfully." 
    }, { status: 200 });

  } catch (error) {
    console.error("Error in password reset:", error);
    return NextResponse.json({ 
      error: "An unexpected error occurred." 
    }, { status: 500 });
  }
}
