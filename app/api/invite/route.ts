import { NextResponse } from "next/server";
import { withPublic } from "@/lib/apiHandler";

export const GET = withPublic(async (request, { supabase }) => {
  const url = new URL(request.url);
  const referral_username = url.searchParams.get("referral");
  const baseUrl = url.origin;

  if (referral_username) {
    // Validate referral username format before using in redirect
    if (!/^[a-zA-Z0-9_-]+$/.test(referral_username)) {
      return NextResponse.redirect(`${baseUrl}/error?message=invalid_referral`);
    }
    return NextResponse.redirect(
      `${baseUrl}/register?referral=${encodeURIComponent(referral_username)}`,
    );
  }

  return NextResponse.redirect(`${baseUrl}/error?message=missing_referral`);
});
