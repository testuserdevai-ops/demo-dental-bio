import { sendTemplateEmail } from "@/utils/mails/sendTemplateEmails";
import { getDomainConfig } from "@/utils/domainConfig";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { withPublic } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";

// Escape HTML special characters to prevent XSS in emails
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Validate URL to prevent javascript: or data: protocol injection
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

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

export const POST = withPublic(async (request, { supabase }) => {
  const { email, referralLink, name } = await request.json();
  const headersList = await headers();
  const domainConfig = getDomainConfig(headersList);

  if (!email) {
    return apiResponse.badRequest("Email is required.");
  }

  // Validate referral link is a safe URL
  if (referralLink && !isSafeUrl(referralLink)) {
    return apiResponse.badRequest("Invalid referral link.");
  }

  // Sanitize user-provided values before inserting into HTML
  const safeName = escapeHtml(name || "");
  const safeReferralLink = referralLink ? encodeURI(referralLink) : "";

  await sendTemplateEmail(
    {
      sendTo: email,
      title: `You're invited to join ${domainConfig.brandName}!`,
      content: `
			<h1 style="font-size: 28px; font-weight: 300; color: #7646ff; line-height: 1.5; margin: 0;">
					${safeName} invited you to join ${domainConfig.brandName}!
			</h1>
			<p style="font-size: 16px; font-weight: 400; color: #1c1c21; line-height: 1.7; margin-top: 50px;">
					Hey there!
			</p>
			<p style="font-size: 16px; font-weight: 500; color: #1c1c21; line-height: 1.7; margin: 20px 0;">
					${safeName} has invited you to join <b>${domainConfig.brandName}!</b> If you upgrade to the Pro Plan, you'll
					both receive one month free.
					Alternatively, you can start with the Free Plan.
					<br /><br />
					Click the button below to sign up and get started!
			</p>

			<!-- Referral Link Button -->
			<p>
				<a href="${safeReferralLink}" class="button">Sign Up Now</a>
			</p>`,
    },
    domainConfig,
  );

  return apiResponse.success({ message: "Invite sent successfully." });
});
