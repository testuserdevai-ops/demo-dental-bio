import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    isResend,
    email,
    password,
    username,
    firstName,
    lastName,
    birthday,
    position,
    offerCode,
    country,
    title,
    otp,
    inviteUserName,
    location,
    domain,
    brand,
    vertical
  } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    if (!isResend) {
      // Check if email is already in use
      const { data: emailCheckData, error: emailCheckError } = await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .single();

      if (emailCheckError && emailCheckError.code !== "PGRST116") {
        return NextResponse.json({ error: "Error checking email availability." }, { status: 500 });
      }

      if (emailCheckData) {
        return NextResponse.json({ error: "Email is already in use." }, { status: 400 });
      }
    }

    // Send OTP email for registration
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: {
          email,
          password,
          username,
          first_name: firstName,
          last_name: lastName,
          birthday,
          position,
          offer_code: offerCode,
          country,
          title,
          otp,
          inviteUserName,
          location,
          domain,
          brand,
          vertical
        }
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "OTP sent successfully." }, { status: 200 });
  } catch (err) {
    console.error("Error sending OTP:", err);
    return NextResponse.json({ error: "Unexpected error occurred." }, { status: 500 });
  }
} 