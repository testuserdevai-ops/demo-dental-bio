import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getBlockedDomain } from '@/utils/blockedDomains';
import { isBlockedFingerprint } from '@/utils/blockedFingerprints';
import { getClientIp, isBlockedIp } from '@/utils/blockedIps';
import { sendBlockedDomainAttemptEmail } from '@/utils/mails/sendReportEmail';

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
    vertical,
    deviceFingerprint,
  } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    // Check if email domain is blocked (disposable/temp email providers)
    const blockedDomain = await getBlockedDomain(email);
    if (blockedDomain) {
      sendBlockedDomainAttemptEmail({
        email,
        blocked_domain: blockedDomain,
        username,
        first_name: firstName,
        last_name: lastName,
        position,
        country,
        location,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        time: new Date().toISOString(),
        route: '/api/register/send-otp',
      });
      return NextResponse.json({ error: "Registration from this email provider is not allowed. Please use a different email address." }, { status: 400 });
    }

    // Silently block registration from blocked device fingerprints or IPs
    // Return fake success so the user doesn't know they're blocked
    const clientIp = getClientIp(request);
    const [fingerprintBlocked, ipBlocked] = await Promise.all([
      isBlockedFingerprint(deviceFingerprint),
      isBlockedIp(clientIp),
    ]);
    if (fingerprintBlocked || ipBlocked) {
      return NextResponse.json({ message: "OTP sent successfully." }, { status: 200 });
    }

    // NOTE:
    // We intentionally do NOT block on `public.users` existence here.
    // If a user started signup but didn’t complete OTP verification, `public.users` (and related rows)
    // may already exist due to DB triggers — blocking would permanently prevent them from completing signup.
    // `signInWithOtp` is safe to call for both first-time signup and resends.

    // Send OTP email for registration
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: {
          email,
          username,
          first_name: firstName,
          last_name: lastName,
          birthday,
          position,
          offer_code: offerCode,
          country,
          title,
          inviteUserName,
          location,
          domain,
          brand,
          vertical
        }
      }
    });

    if (error) {
      // If the email is already registered and confirmed, Supabase will typically reject with a message like
      // "Email is already in use". In that case the correct UX is to redirect user to login.
      const msg = error.message?.toLowerCase?.() ?? "";
      if (msg.includes("already") && msg.includes("use")) {
        return NextResponse.json({ error: "An account with this email already exists. Please log in instead." }, { status: 400 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "OTP sent successfully." }, { status: 200 });
  } catch (err) {
    console.error("Error sending OTP:", err);
    return NextResponse.json({ error: "Unexpected error occurred." }, { status: 500 });
  }
} 